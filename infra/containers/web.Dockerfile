FROM node:24.14.0-alpine3.23@sha256:7fddd9ddeae8196abf4a3ef2de34e11f7b1a722119f91f28ddf1e99dcafdf114 AS build
RUN apk add --no-cache bash && corepack enable
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile --filter @company-os/web...
COPY apps/web apps/web
COPY scripts/package-web scripts/package-web
RUN pnpm --filter @company-os/web build

FROM node:24.14.0-alpine3.23@sha256:7fddd9ddeae8196abf4a3ef2de34e11f7b1a722119f91f28ddf1e99dcafdf114 AS runtime
RUN apk add --no-cache bash \
  && addgroup -g 10001 company-os \
  && adduser -D -H -u 10001 -G company-os company-os
WORKDIR /app
COPY --from=build --chown=10001:10001 /workspace/dist/web /app/dist/web
COPY --chown=10001:10001 scripts/start-web /app/scripts/start-web
COPY --chown=10001:10001 scripts/verify-web-artifact /app/scripts/verify-web-artifact
ENV NODE_ENV=production WEB_HOST=0.0.0.0 PORT=3000
USER 10001:10001
EXPOSE 3000
HEALTHCHECK --interval=5s --timeout=3s --start-period=30s --retries=12 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["./scripts/start-web"]
