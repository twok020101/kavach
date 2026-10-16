import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { env } from './env';
import { claimRoutes } from './routes/claims';
import { demoRoutes } from './routes/demo';
import { deskRoutes } from './routes/desk';
import { documentRoutes } from './routes/documents';
import { healthRoutes } from './routes/health';
import { householdRoutes } from './routes/households';
import { whatsappRoutes } from './routes/whatsapp';
import { actionRoutes } from './routes/actions';
import { lifeChangeRoutes } from './routes/life-changes';
import { planRoutes } from './routes/plans';
import { proofRoutes } from './routes/proof';
import { liveRoutes } from './routes/live';

export async function buildServer() {
  const app = Fastify({
    logger:
      env.NODE_ENV === 'development'
        ? { transport: { target: 'pino-pretty', options: { singleLine: true } } }
        : true,
    bodyLimit: 2 * 1024 * 1024,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(cors, {
    origin: [env.PUBLIC_WEB_URL],
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });
  await app.register(multipart, { limits: { fileSize: 15 * 1024 * 1024, files: 4 } });
  await app.register(websocket);

  // Feature routes register here, one plugin per area, all under /v1.
  await app.register(healthRoutes);
  await app.register(demoRoutes);
  await app.register(householdRoutes);
  await app.register(planRoutes);
  await app.register(lifeChangeRoutes);
  await app.register(actionRoutes);
  await app.register(deskRoutes);
  await app.register(documentRoutes);
  await app.register(proofRoutes);
  await app.register(claimRoutes);
  await app.register(liveRoutes);
  await app.register(whatsappRoutes);

  return app;
}
