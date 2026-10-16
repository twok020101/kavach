import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { AssessClaimRequest, ClaimCase, ClaimList, UpdateAppealRequest } from '@kavach/schemas';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { loadHousehold, requireUser } from '../auth';
import {
  appealPdf,
  assess,
  createClaim,
  draftClaimAppeal,
  getClaim,
  listClaims,
  updateAppealText,
} from '../claims/service';
import { blobs } from '../lib/blobs';
import { repoRoot } from '../paths';

const Params = z.object({ hid: z.string() });
const ClaimParams = Params.extend({ cid: z.string() });
const ACCEPTED = /^(application\/pdf|image\/(png|jpeg|webp|heic|heif))$/;
const SAMPLE_LETTER = 'suraksha-settlement-letter.pdf';

/** Moment 3: settlement letter → engine verdict per deduction → verified appeal letter (WP-10). */
export const claimRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', requireUser);

  app.get(
    '/v1/households/:hid/claims',
    { schema: { params: Params, response: { 200: ClaimList } } },
    async (request) => {
      await loadHousehold(request, request.params.hid);
      return { claims: await listClaims(request.params.hid) };
    },
  );

  // S30: upload a settlement letter (photo or PDF) as a multipart "file" field.
  app.post(
    '/v1/households/:hid/claims',
    { schema: { params: Params, response: { 201: ClaimCase } } },
    async (request, reply) => {
      const household = await loadHousehold(request, request.params.hid);
      const file = await request.file();
      if (!file) throw httpError(400, 'Send the letter as a multipart "file" field');
      if (!ACCEPTED.test(file.mimetype)) {
        throw httpError(415, `Send a PDF or a photo, not ${file.mimetype}`);
      }
      const claim = await createClaim(household, {
        filename: file.filename,
        mimeType: file.mimetype,
        bytes: await file.toBuffer(),
      });
      return reply.code(201).send(claim);
    },
  );

  // S30 "Use the sample letter": the CX-1 Suraksha settlement letter from data/samples.
  app.post(
    '/v1/households/:hid/claims::sample',
    { schema: { params: Params, response: { 201: ClaimCase } } },
    async (request, reply) => {
      const household = await loadHousehold(request, request.params.hid);
      const bytes = await readFile(resolve(repoRoot, 'data/samples', SAMPLE_LETTER));
      const claim = await createClaim(household, {
        filename: SAMPLE_LETTER,
        mimeType: 'application/pdf',
        bytes,
        isSample: true,
      });
      return reply.code(201).send(claim);
    },
  );

  app.get(
    '/v1/households/:hid/claims/:cid',
    { schema: { params: ClaimParams, response: { 200: ClaimCase } } },
    async (request) => {
      await loadHousehold(request, request.params.hid);
      return getClaim(request.params.hid, request.params.cid);
    },
  );

  // S31: assess again, with the family's corrections to the bill facts.
  app.post(
    '/v1/households/:hid/claims/:cid(^[^:]+)::assess',
    {
      schema: {
        params: ClaimParams,
        body: AssessClaimRequest.nullish(),
        response: { 200: ClaimCase },
      },
    },
    async (request) => {
      const household = await loadHousehold(request, request.params.hid);
      const claim = await getClaim(household.id, request.params.cid);
      return assess(household, claim, request.body ?? {});
    },
  );

  app.get(
    '/v1/households/:hid/claims/:cid/letter',
    { schema: { params: ClaimParams } },
    async (request, reply) => {
      await loadHousehold(request, request.params.hid);
      const claim = await getClaim(request.params.hid, request.params.cid);
      if (!claim.letterPath) throw httpError(404, 'No letter stored');
      return reply
        .type(claim.letterMimeType ?? 'application/octet-stream')
        .header('cache-control', 'private, max-age=300')
        .send(await blobs.get(claim.letterPath));
    },
  );

  // S32: draft the appeal (Pro) and verify it.
  app.post(
    '/v1/households/:hid/claims/:cid/appeal',
    { schema: { params: ClaimParams, response: { 200: ClaimCase } } },
    async (request) => {
      const household = await loadHousehold(request, request.params.hid);
      const claim = await getClaim(household.id, request.params.cid);
      return draftClaimAppeal(household, claim);
    },
  );

  // S32: the family edited the letter; it is verified again. (POST: CORS here allows GET/POST only.)
  app.post(
    '/v1/households/:hid/claims/:cid/appeal/text',
    { schema: { params: ClaimParams, body: UpdateAppealRequest, response: { 200: ClaimCase } } },
    async (request) => {
      await loadHousehold(request, request.params.hid);
      const claim = await getClaim(request.params.hid, request.params.cid);
      return updateAppealText(claim, request.body.text);
    },
  );

  // The verified letter as a PDF; 409 with the failed checks while verification fails.
  app.get(
    '/v1/households/:hid/claims/:cid/appeal/pdf',
    { schema: { params: ClaimParams } },
    async (request, reply) => {
      await loadHousehold(request, request.params.hid);
      const claim = await getClaim(request.params.hid, request.params.cid);
      if (claim.appeal && !claim.appeal.verification.ok) {
        return reply.code(409).send({
          error: 'verification_failed',
          message: 'The appeal letter failed verification',
          checks: claim.appeal.verification.checks.filter((c) => !c.ok),
        });
      }
      const pdf = await appealPdf(claim);
      return reply
        .type('application/pdf')
        .header(
          'content-disposition',
          `attachment; filename="${pdf.filename.replace(/[^\w.-]/g, '-')}"`,
        )
        .send(pdf.bytes);
    },
  );
};

const httpError = (statusCode: number, message: string) =>
  Object.assign(new Error(message), { statusCode });
