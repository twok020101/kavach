import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  CreateDeskSessionBody,
  CreateDeskSessionResponse,
  DeskAnswer,
  DeskCaptureResponse,
  DeskEvaluateBody,
  DeskEvaluation,
  DeskSession,
  DeskSessionSummary,
  DeskTurnBody,
} from '@kavach/schemas';
import type { FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { EstimateImage } from '../agents/estimate-reader';
import { loadHousehold, requireUser } from '../auth';
import {
  captureEstimate,
  createSession,
  endSession,
  evaluateSession,
  getSession,
  takeTurn,
} from '../desk/sessions';
import { env } from '../env';
import { repoRoot } from '../paths';

const HouseholdParams = z.object({ hid: z.string() });
const SessionParams = z.object({ hid: z.string(), sid: z.string() });
/** With FAKE_LLM=1, which recorded estimate reading to return (e.g. `desk-estimate-unclear`). */
const CaptureQuery = z.object({
  fixture: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
});

const SAMPLE_PHOTO = resolve(repoRoot, 'data/samples/city-heart-estimate-photo.png');
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];

/** The text-and-photo hospital desk (docs/plan/06-api.md "Moment 2"). */
export const deskRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', requireUser);
  const base = '/v1/households/:hid/desk/sessions';
  // A session id followed by a `:action` needs the id's pattern so the router knows where it ends.
  const session = `${base}/:sid(^[\\w-]+)`;

  app.post(
    base,
    {
      schema: {
        params: HouseholdParams,
        body: CreateDeskSessionBody,
        response: { 200: CreateDeskSessionResponse },
      },
    },
    async (request) =>
      createSession(await loadHousehold(request, request.params.hid), request.body),
  );

  app.get(
    `${base}/:sid`,
    { schema: { params: SessionParams, response: { 200: DeskSession } } },
    async (request) =>
      getSession(await loadHousehold(request, request.params.hid), request.params.sid),
  );

  app.post(
    `${base}/:sid/captures`,
    {
      schema: {
        params: SessionParams,
        querystring: CaptureQuery,
        response: { 200: DeskCaptureResponse },
      },
    },
    async (request) => {
      const household = await loadHousehold(request, request.params.hid);
      const images = await uploadedImages(request);
      return captureEstimate(household, request.params.sid, images, fakeFixture(request.query));
    },
  );

  // Judge shortcut: "Try the hospital scene" without a camera uses the sample estimate photo.
  app.post(
    `${base}/:sid/captures::sample`,
    {
      schema: {
        params: SessionParams,
        querystring: CaptureQuery,
        response: { 200: DeskCaptureResponse },
      },
    },
    async (request) => {
      const household = await loadHousehold(request, request.params.hid);
      const data = await readFile(SAMPLE_PHOTO);
      return captureEstimate(
        household,
        request.params.sid,
        [{ data, mimeType: 'image/png' }],
        fakeFixture(request.query),
      );
    },
  );

  app.post(
    `${base}/:sid/turns`,
    { schema: { params: SessionParams, body: DeskTurnBody, response: { 200: DeskAnswer } } },
    async (request) =>
      takeTurn(await loadHousehold(request, request.params.hid), request.params.sid, request.body),
  );

  app.post(
    `${session}::evaluate`,
    {
      schema: {
        params: SessionParams,
        body: DeskEvaluateBody.default({}),
        response: { 200: DeskEvaluation },
      },
    },
    async (request) =>
      evaluateSession(
        await loadHousehold(request, request.params.hid),
        request.params.sid,
        request.body.roomOptions,
      ),
  );

  app.post(
    `${session}::end`,
    { schema: { params: SessionParams, response: { 200: DeskSessionSummary } } },
    async (request) =>
      endSession(await loadHousehold(request, request.params.hid), request.params.sid),
  );
};

/** Reads the multipart image parts of a capture upload. */
async function uploadedImages(request: FastifyRequest): Promise<EstimateImage[]> {
  if (!request.isMultipart()) throw badRequest('Send the estimate photo as multipart/form-data');
  const images: EstimateImage[] = [];
  for await (const part of request.files()) {
    if (!IMAGE_TYPES.includes(part.mimetype)) {
      throw badRequest(`Unsupported file type ${part.mimetype}: send a photo or PDF`);
    }
    images.push({ data: await part.toBuffer(), mimeType: part.mimetype });
  }
  if (images.length === 0) throw badRequest('No estimate photo in the upload');
  return images;
}

const fakeFixture = (query: z.infer<typeof CaptureQuery>) =>
  env.FAKE_LLM && query.fixture ? { fixture: query.fixture } : {};

const badRequest = (message: string) => Object.assign(new Error(message), { statusCode: 400 });
