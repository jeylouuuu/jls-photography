# JLS Photography — production image
# Uses Node 24 which ships the built-in `node:sqlite` module (no native deps).
FROM node:24-alpine

ENV NODE_ENV=production \
    PORT=3000 \
    DB_PATH=/data/photography.db \
    UPLOADS_DIR=/data/uploads

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# App source
COPY src ./src
COPY public ./public

# Runtime user (non-root)
RUN addgroup -S jls && adduser -S jls -G jls \
    && mkdir -p /data && chown -R jls:jls /data
USER jls

VOLUME ["/data"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1

CMD ["node", "src/server.js"]
