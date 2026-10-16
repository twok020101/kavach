# Build from the repo root:  docker build -f apps/api/Dockerfile .
FROM node:22-slim AS build
WORKDIR /repo
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile --filter @kavach/api... \
 && pnpm --filter @kavach/api build \
 && pnpm --filter @kavach/api deploy --prod --legacy /out

FROM node:22-slim
# ffmpeg converts WhatsApp voice notes (OGG/Opus) to and from PCM.
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production PORT=8080
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /out/package.json ./
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/fixtures ./fixtures
# Fonts for the WhatsApp card PNG (Noto Sans Devanagari).
COPY --from=build /repo/apps/api/assets ./assets
COPY --from=build /repo/apps/api/src/agents/prompts ./src/agents/prompts
# repoRoot resolves to / in this image; sample documents and the sample estimate photo live there.
COPY --from=build /repo/data/samples /data/samples
EXPOSE 8080
CMD ["node", "dist/index.js"]
