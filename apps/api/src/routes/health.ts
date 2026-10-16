import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { env } from '../env';
import { models } from '../lib/gemini';

export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/health', async () => ({
    ok: true,
    store: env.STORE,
    fakeLlm: env.FAKE_LLM,
    models,
  }));
};
