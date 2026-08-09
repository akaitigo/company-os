FROM node:24.14.0-alpine3.23@sha256:7fddd9ddeae8196abf4a3ef2de34e11f7b1a722119f91f28ddf1e99dcafdf114 AS build
RUN corepack enable
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api apps/api
COPY modules modules
COPY packages packages
RUN pnpm install --frozen-lockfile --filter @company-os/api...
RUN pnpm --filter @company-os/api... build \
  && pnpm --filter @company-os/api deploy --prod /out \
  && find /out -type f \( -name '*.ts' -o -name '*.map' \) -delete

FROM node:24.14.0-alpine3.23@sha256:7fddd9ddeae8196abf4a3ef2de34e11f7b1a722119f91f28ddf1e99dcafdf114 AS runtime
RUN addgroup -g 10001 company-os \
  && adduser -D -H -u 10001 -G company-os company-os
WORKDIR /app
COPY --from=build --chown=10001:10001 /out /app
ENV NODE_ENV=production API_HOST=0.0.0.0 PORT=3001
USER 10001:10001
EXPOSE 3001
HEALTHCHECK --interval=5s --timeout=3s --start-period=30s --retries=12 \
  CMD node -e "fetch('http://127.0.0.1:3001/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["node", "dist/main.js"]
