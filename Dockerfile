FROM node:22.20-alpine AS base

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache libc6-compat openssl

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run prisma:generate

FROM base AS dev

ENV NODE_ENV=development

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0"]

FROM base AS production

ENV NODE_ENV=production
ENV PORT=3000

RUN npm run build

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3000}/api/health" > /dev/null || exit 1

CMD ["sh", "-c", "npx prisma migrate deploy && npm run media:sync-approved && npm run start -- -H 0.0.0.0 -p ${PORT:-3000}"]
