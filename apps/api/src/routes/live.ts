import { Locale, type LiveServerMessage } from '@kavach/schemas';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { loadHousehold, requireUser } from '../auth';
import { getSession } from '../desk/sessions';
import { openLiveBridge } from '../live/bridge';
import { inProcessDesk } from '../live/port';

const Params = z.object({ sessionId: z.string().regex(/^[\w-]+$/) });
const Query = z.object({
  hid: z.string(),
  /** Browsers can't set headers on a WebSocket, so the Firebase ID token comes in the query. */
  token: z.string().optional(),
  language: Locale.optional(),
});

/** The live desk socket (docs/plan/06-api.md §3): browser ⇄ live model, audio only. */
export const liveRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/v1/live/:sessionId',
    {
      websocket: true,
      schema: { params: Params, querystring: Query },
      preValidation: async (request: FastifyRequest, reply: FastifyReply) => {
        const { token } = request.query as z.infer<typeof Query>;
        if (token) request.headers.authorization = `Bearer ${token}`;
        await requireUser(request, reply);
      },
    },
    async (socket, request) => {
      const { sessionId } = request.params;
      const { hid } = request.query;
      const send = (message: LiveServerMessage) => {
        if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
      };

      // Messages that arrive while the model session opens are kept and replayed.
      const early: string[] = [];
      let receive: ((raw: string) => void) | undefined;
      let stop: (() => void) | undefined;
      socket.on('message', (raw: Buffer) =>
        receive ? receive(raw.toString()) : early.push(raw.toString()),
      );
      socket.on('close', () => stop?.());

      try {
        const household = await loadHousehold(request, hid);
        const session = await getSession(household, sessionId);
        if (session.status !== 'active') {
          send({ type: 'error', code: 'session_ended', fallback: 'text' });
          return socket.close(1000);
        }
        const bridge = await openLiveBridge({
          sessionId,
          language: request.query.language ?? session.language,
          port: inProcessDesk(household.id, sessionId),
          send,
          close: () => socket.close(1000),
          log: (message) => request.log.warn(message),
        });
        receive = bridge.receive;
        stop = bridge.stop;
        if (socket.readyState !== socket.OPEN) return stop();
        early.splice(0).forEach(receive);
      } catch (error) {
        request.log.warn({ err: error }, 'live socket failed to open');
        send({ type: 'error', code: 'session_not_found', fallback: 'text' });
        socket.close(1011);
      }
    },
  );
};
