FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
# npm ci respeta el lockfile al pie de la letra, incluyendo qué binario nativo
# de sharp quedó resuelto — y ese lockfile se generó en Windows, así que solo
# lista el binario win32. npm install reevalúa las dependencias opcionales
# para la plataforma real del contenedor (Linux) y trae el binario correcto.
RUN npm install

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 4100
CMD ["node", "dist/server.js"]
