FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY openapi.yaml ./
COPY .uigen ./.uigen

ENV PORT=8080
EXPOSE 8080

CMD ["npm", "start"]
