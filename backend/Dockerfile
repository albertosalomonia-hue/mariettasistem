FROM node:22-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
# npm ci respeta el lockfile al pie de la letra, incluyendo qué binario nativo
# de sharp quedó resuelto — y ese lockfile se generó en Windows, así que solo
# lista el binario win32. npm install reevalúa las dependencias opcionales,
# pero sin --libc instala TANTO el binario glibc como el musl (npm no filtra
# por libc si no se lo pedís), y sharp se confunde cuando encuentra varios
# binarios instalados. Forzamos exactamente el que corresponde a esta imagen
# (Debian/bookworm = glibc).
RUN npm install --os=linux --cpu=x64 --libc=glibc

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm install --omit=dev --os=linux --cpu=x64 --libc=glibc

COPY --from=builder /app/dist ./dist

EXPOSE 4100
CMD ["node", "dist/server.js"]
