FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# Install dependencies
COPY platform-shared/package.json platform-shared/pnpm-lock.yaml platform-shared/
COPY flow-shared/package.json flow-shared/pnpm-lock.yaml flow-shared/
COPY ai/shared/package.json ai/shared/pnpm-lock.yaml ai/shared/
COPY ai/app/package.json ai/app/pnpm-lock.yaml ai/app/
RUN cd platform-shared && pnpm install --frozen-lockfile && cd ../..
RUN cd flow-shared && pnpm install --frozen-lockfile && cd ../..
RUN cd ai/shared && pnpm install --frozen-lockfile && cd ../..
RUN cd ai/app && pnpm install --frozen-lockfile

# Copy source and build shared packages
COPY platform-shared/ platform-shared/
COPY flow-shared/ flow-shared/
COPY ai/shared/ ai/shared/
RUN cd platform-shared && pnpm build
RUN cd flow-shared && pnpm build
RUN cd ai/shared && pnpm build

# Copy app source and build
COPY ai/app/ ai/app/
RUN cd ai/app && pnpm build

# Production stage -- serve with nginx
FROM nginx:alpine
COPY --from=base /app/ai/app/dist /usr/share/nginx/html
COPY ai/app/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 5300
CMD ["nginx", "-g", "daemon off;"]
