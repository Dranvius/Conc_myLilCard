FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm install

COPY . .

RUN npm run prisma:generate && npm run build -w apps/api

EXPOSE 4000

CMD ["sh", "-c", "npm run prisma:generate && npm run prisma:deploy && node apps/api/dist/main.js"]
