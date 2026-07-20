FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

COPY shared/platform-shared/package.json shared/platform-shared/pnpm-lock.yaml shared/platform-shared/
COPY ai/app/package.json ai/app/pnpm-lock.yaml ai/app/
RUN cd shared/platform-shared && pnpm install --frozen-lockfile
RUN cd ai/app && pnpm install --frozen-lockfile

COPY shared/platform-shared/ shared/platform-shared/
RUN cd shared/platform-shared && pnpm build

COPY scripts/vite-shared-source.mjs scripts/vite-dev-proxy.mjs scripts/
COPY ai/app/ ai/app/
RUN cd ai/app && pnpm build

FROM nginx:alpine
COPY --from=base /app/ai/app/dist /usr/share/nginx/html
COPY ai/app/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 5300
CMD ["nginx", "-g", "daemon off;"]
