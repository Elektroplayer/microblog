# ---------- Build ----------
FROM node:24-bookworm-slim AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN corepack enable && pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src
COPY html ./html

RUN pnpm build


# ---------- Runtime ----------
FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN corepack enable && pnpm install --prod --frozen-lockfile \
    && corepack disable \
    && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/html ./html

EXPOSE 3000

CMD ["node", "dist/index.js"]
