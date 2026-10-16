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
import { demoRoutes } from './routes/demo';
import { deskRoutes } from './routes/desk';
import { documentRoutes } from './routes/documents';
import { healthRoutes } from './routes/health';
import { householdRoutes } from './routes/households';
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

  await app.register(cors, { origin: [env.PUBLIC_WEB_URL], credentials: true });
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });
  await app.register(multipart, { limits: { fileSize: 15 * 1024 * 1024, files: 4 } });
  await app.register(websocket);

  // Feature routes register here, one plugin per area, all under /v1.
  await app.register(healthRoutes);
  await app.register(demoRoutes);
  await app.register(householdRoutes);
  await app.register(deskRoutes);
  await app.register(documentRoutes);
  await app.register(liveRoutes);

  return app;
}
