FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json jest.config.js ./
COPY src ./src
COPY scripts ./scripts
COPY tests ./tests

RUN npm run build

EXPOSE 4000

CMD ["sh", "-c", "node dist/db/migrate.js && node dist/index.js"]
