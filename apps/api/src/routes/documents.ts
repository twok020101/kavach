import {
  Clause,
  ClauseSearchRequest,
  ClauseSearchResponse,
  ConfirmDocumentResponse,
  DocumentList,
  DocumentRecord,
} from '@kavach/schemas';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { loadHousehold, requireUser } from '../auth';
import { addSampleDocuments } from '../documents/samples';
import {
  addDocument,
  confirmDocument,
  getDocument,
  listDocuments,
} from '../documents/service';
import { blobs } from '../lib/blobs';
import { getClause, searchClauses, seedClauses } from '../retrieval/clauses';

const Params = z.object({ hid: z.string() });
const DocParams = Params.extend({ docId: z.string() });
const ACCEPTED = /^(application\/pdf|image\/(png|jpeg|webp|heic|heif))$/;

/** Household documents (upload, read, confirm, view) and the clause library (WP-8). */
export const documentRoutes: FastifyPluginAsyncZod = async (app) => {
  // STORE=memory starts empty, so load the committed clause library on every start.
  const seeded = await seedClauses();
  app.log.info(`Clause library: ${seeded} clauses`);

  app.addHook('preHandler', requireUser);

  app.post(
    '/v1/households/:hid/documents',
    { schema: { params: Params, response: { 202: DocumentRecord } } },
    async (request, reply) => {
      const household = await loadHousehold(request, request.params.hid);
      const file = await request.file();
      if (!file) throw httpError(400, 'Send the document as a multipart "file" field');
      if (!ACCEPTED.test(file.mimetype)) {
        throw httpError(415, `Send a PDF or a photo, not ${file.mimetype}`);
      }
      const document = await addDocument(household, {
        filename: file.filename,
        mimeType: file.mimetype,
        bytes: await file.toBuffer(),
      });
      return reply.code(202).send(document);
    },
  );

  // Demo: attach the Sharma family's sample documents (S07).
  app.post(
    '/v1/households/:hid/documents::samples',
    { schema: { params: Params, response: { 202: DocumentList } } },
    async (request, reply) => {
      const household = await loadHousehold(request, request.params.hid);
      return reply.code(202).send({ documents: await addSampleDocuments(household) });
    },
  );

  app.get(
    '/v1/households/:hid/documents',
    { schema: { params: Params, response: { 200: DocumentList } } },
    async (request) => {
      await loadHousehold(request, request.params.hid);
      return { documents: await listDocuments(request.params.hid) };
    },
  );

  app.get(
    '/v1/households/:hid/documents/:docId',
    { schema: { params: DocParams, response: { 200: DocumentRecord } } },
    async (request) => {
      await loadHousehold(request, request.params.hid);
      return getDocument(request.params.hid, request.params.docId);
    },
  );

  app.post(
    // The regex stops the id at ':' so that ':confirm' is not read as part of it.
    '/v1/households/:hid/documents/:docId(^[^:]+)::confirm',
    { schema: { params: DocParams, response: { 200: ConfirmDocumentResponse } } },
    async (request) => {
      const household = await loadHousehold(request, request.params.hid);
      const document = await getDocument(household.id, request.params.docId);
      return confirmDocument(household, document);
    },
  );

  app.get(
    '/v1/households/:hid/documents/:docId/file',
    { schema: { params: DocParams } },
    async (request, reply) => {
      await loadHousehold(request, request.params.hid);
      const document = await getDocument(request.params.hid, request.params.docId);
      const name = encodeURIComponent(document.filename);
      return reply
        .type(document.mimeType)
        .header('content-disposition', `inline; filename*=UTF-8''${name}`)
        .header('cache-control', 'private, max-age=300')
        .send(await blobs.get(document.storagePath));
    },
  );

  app.post(
    '/v1/clauses::search',
    { schema: { body: ClauseSearchRequest, response: { 200: ClauseSearchResponse } } },
    async (request) => {
      const { query, productKey, limit } = request.body;
      return { results: await searchClauses(query, productKey, limit) };
    },
  );

  app.get(
    '/v1/clauses/:id',
    { schema: { params: z.object({ id: z.string() }), response: { 200: Clause } } },
    async (request) => {
      const clause = await getClause(request.params.id);
      if (!clause) throw httpError(404, 'Clause not found');
      return clause;
    },
  );
};

const httpError = (statusCode: number, message: string) =>
  Object.assign(new Error(message), { statusCode });
