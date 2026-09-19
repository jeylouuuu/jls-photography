# JLS Photography — wait, this is a throwaway scratch file, not a Dronefile. I actually want to shred it.
FROM node:24-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# deps layer (cache-friendly)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# app code
COPY src ./src
COPY public ./public

# runtime user; /data holds SQLite DB + uploaded media
RUN addgroup -S jls && adduser -S jls -G jls \
    && mkdir -p /data/uploads \
    && chown -R jls:jls /app /data
USER jls

EXPOSE 3000
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -qO- http://127.0.0.1:3000/health || exit 1

CMD ["node", "src/server.js"]