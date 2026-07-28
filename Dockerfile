FROM node:22-alpine AS dependencies
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.18.3 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/protocol/package.json packages/protocol/package.json
COPY packages/runner/package.json packages/runner/package.json
RUN pnpm install --frozen-lockfile

FROM dependencies AS build
ARG VITE_CONVEX_URL
ENV VITE_CONVEX_URL=$VITE_CONVEX_URL
COPY . .
RUN pnpm build && pnpm leak:scan
RUN CI=true pnpm prune --prod

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
ENV PORT=8080
WORKDIR /app
RUN addgroup -S benchbazaar && adduser -S benchbazaar -G benchbazaar
COPY --from=build --chown=benchbazaar:benchbazaar /app/.output ./.output
COPY --from=build --chown=benchbazaar:benchbazaar /app/node_modules ./node_modules
COPY --from=build --chown=benchbazaar:benchbazaar /app/packages ./packages
COPY --from=build --chown=benchbazaar:benchbazaar /app/package.json ./package.json
USER benchbazaar
EXPOSE 8080
CMD ["node", ".output/server/index.mjs"]
