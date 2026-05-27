FROM node:22-alpine AS builder

WORKDIR /app

ARG NEXT_PUBLIC_PANEL_URL=
ENV NEXT_PUBLIC_PANEL_URL=${NEXT_PUBLIC_PANEL_URL}

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY app ./app
COPY lib ./lib
COPY server.ts next.config.ts next-env.d.ts tsconfig.json openapi.yaml ./

EXPOSE 3000

CMD ["npm", "start"]
