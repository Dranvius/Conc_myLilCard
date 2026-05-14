FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile

COPY . .

# Evita que Prisma intente reinstalar @prisma/client durante generate
ENV PRISMA_GENERATE_SKIP_AUTOINSTALL=true

RUN pnpm run prisma:generate && pnpm --filter @respira/api run build

EXPOSE 4000

CMD ["sh", "-c", "pnpm run prisma:generate && pnpm run prisma:deploy && node apps/api/dist/main.js"]
