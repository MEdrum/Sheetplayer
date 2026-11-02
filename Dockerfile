FROM node:22-trixie-slim AS build

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends musescore3 \
  && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-trixie-slim AS runtime

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV MUSESCORE_BIN=/usr/bin/musescore3
WORKDIR /app

COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./package.json

RUN mkdir -p /app/data && chown -R node:node /app
USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then((r) => { if (!r.ok) process.exit(1); }).catch(() => process.exit(1))"

CMD ["node", "build"]
