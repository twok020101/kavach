import { createHash, randomBytes } from 'node:crypto';
import {
  CreateInviteBody,
  CreateInviteResponse,
  FamilyAccess,
  Household,
  Invite,
  InvitePreview,
} from '@kavach/schemas';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { loadHousehold, requireUser } from '../auth';
import { env } from '../env';
import { getSender } from '../channels/whatsapp/senders';
import { store } from '../store';
import { requireOwner } from './setup';

const Params = z.object({ hid: z.string() });
const INVITE_DAYS = 14;

/** Invite ids are a hash of the token, so a leaked store row can't be used as a link. */
const inviteId = (token: string) => createHash('sha256').update(token).digest('hex').slice(0, 32);
const notFound = () => Object.assign(new Error('Invite not found'), { statusCode: 404 });

/** Public: what an invite link shows before sign-in (S02). */
export const inviteRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/v1/public/invites/:token',
    {
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
      schema: { params: z.object({ token: z.string() }), response: { 200: InvitePreview } },
    },
    async (request) => {
      const { invite, household } = await openInvite(request.params.token);
      const owner = household.members.find((m) => m.relation === 'self');
      return {
        householdName: household.name,
        inviterName: owner?.name ?? household.name,
        memberName: household.members.find((m) => m.id === invite.memberId)?.name ?? '',
        language: invite.language,
      };
    },
  );
};

/** S28 Family access: who can open the household, invites by link or phone, the hospital alert contact. */
export const accessRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', requireUser);

  app.get(
    '/v1/households/:hid/access',
    { schema: { params: Params, response: { 200: FamilyAccess } } },
    async (request) => {
      const household = await loadHousehold(request, request.params.hid);
      const invites = (await store.list<Invite>('invites')).filter(
        (i) => i.householdId === household.id && !i.acceptedBy && i.expiresAt > now(),
      );
      return {
        access:
          household.access ??
          household.accessUids.map((uid) => ({
            uid,
            role: 'owner' as const,
            addedAt: household.createdAt,
          })),
        invites,
        whatsapp: await Promise.all(household.members.map(whatsappState)),
        alertContactMemberId: household.alertContactMemberId,
      };
    },
  );

  app.post(
    '/v1/households/:hid/invites',
    {
      schema: { params: Params, body: CreateInviteBody, response: { 201: CreateInviteResponse } },
    },
    async (request, reply) => {
      const household = await loadHousehold(request, request.params.hid);
      requireOwner(household, request.uid);
      if (!household.members.some((m) => m.id === request.body.memberId)) {
        throw Object.assign(new Error('Unknown member'), { statusCode: 400 });
      }
      const token = randomBytes(18).toString('base64url');
      const invite: Invite = {
        id: inviteId(token),
        householdId: household.id,
        ...request.body,
        createdBy: request.uid,
        createdAt: now(),
        expiresAt: new Date(Date.now() + INVITE_DAYS * 86_400_000).toISOString(),
      };
      await store.set('invites', invite.id, invite);
      // The member's language opens the sign-in page in it (Hindi for Kamala).
      const url = `${env.PUBLIC_WEB_URL}/${invite.language}/sign-in?invite=${token}`;
      return reply.code(201).send({ invite, url });
    },
  );

  app.delete(
    '/v1/households/:hid/invites/:id',
    { schema: { params: Params.extend({ id: z.string() }) } },
    async (request, reply) => {
      const household = await loadHousehold(request, request.params.hid);
      requireOwner(household, request.uid);
      const invite = await store.get<Invite>('invites', request.params.id);
      if (invite?.householdId === household.id) await store.delete('invites', invite.id);
      return reply.code(204).send();
    },
  );

  app.post(
    '/v1/invites/:token/accept',
    {
      schema: {
        params: z.object({ token: z.string() }),
        response: { 200: z.object({ householdId: z.string(), memberId: z.string() }) },
      },
    },
    async (request) => {
      const { invite, household } = await openInvite(request.params.token);
      const access = household.access ?? [];
      // Accepting again (or as the owner) changes nothing.
      if (!access.some((a) => a.uid === request.uid)) {
        access.push({
          uid: request.uid,
          role: 'member',
          memberId: invite.memberId,
          addedAt: now(),
        });
      }
      await store.update('households', household.id, {
        access,
        accessUids: [...new Set([...household.accessUids, request.uid])],
      });
      await store.update('invites', invite.id, { acceptedBy: request.uid });
      return { householdId: household.id, memberId: invite.memberId };
    },
  );

  app.delete(
    '/v1/households/:hid/access/:uid',
    { schema: { params: Params.extend({ uid: z.string() }), response: { 200: Household } } },
    async (request) => {
      const household = await loadHousehold(request, request.params.hid);
      requireOwner(household, request.uid);
      const target = household.access?.find((a) => a.uid === request.params.uid);
      if (!target || target.role === 'owner') {
        throw Object.assign(new Error('Only member logins can be removed'), { statusCode: 400 });
      }
      const patch = {
        access: household.access!.filter((a) => a.uid !== target.uid),
        accessUids: household.accessUids.filter((uid) => uid !== target.uid),
      };
      await store.update('households', household.id, patch);
      return { ...household, ...patch };
    },
  );

  // Who is told when someone in the family is at the hospital (W3 / desk alert).
  app.put(
    '/v1/households/:hid/alert-contact',
    {
      schema: {
        params: Params,
        body: z.object({ memberId: z.string() }),
        response: { 200: Household },
      },
    },
    async (request) => {
      const household = await loadHousehold(request, request.params.hid);
      if (!household.members.some((m) => m.id === request.body.memberId)) {
        throw Object.assign(new Error('Unknown member'), { statusCode: 400 });
      }
      await store.update('households', household.id, {
        alertContactMemberId: request.body.memberId,
      });
      return { ...household, alertContactMemberId: request.body.memberId };
    },
  );
};

const now = () => new Date().toISOString();

/** Joined = said YES to the first-message consent; STOP opts out. */
async function whatsappState(member: Household['members'][number]) {
  if (!member.phone) return { memberId: member.id, state: 'no_number' as const };
  const sender = await getSender(member.phone);
  const state = sender?.optedOut
    ? ('opted_out' as const)
    : member.whatsappConsentAt || sender?.consent?.grantedAt
      ? ('joined' as const)
      : ('not_joined' as const);
  return { memberId: member.id, phone: member.phone, state };
}

async function openInvite(token: string) {
  const invite = await store.get<Invite>('invites', inviteId(token));
  if (!invite || invite.expiresAt < now()) throw notFound();
  const household = await store.get<Household>('households', invite.householdId);
  if (!household) throw notFound();
  return { invite, household };
}
