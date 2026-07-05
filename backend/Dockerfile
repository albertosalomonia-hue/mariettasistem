FROM node:22-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
# npm ci respeta el lockfile al pie de la letra, incluyendo qué binarios
# nativos opcionales quedaron resueltos — y ese lockfile se generó en
# Windows. npm install reevalúa las dependencias opcionales para la
# plataforma real de esta imagen (Debian/bookworm = linux x64 glibc).
RUN npm install --os=linux --cpu=x64 --libc=glibc

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production

# cwebp (paquete `webp`): usado para redimensionar/convertir la foto de
# empleado a WEBP. A diferencia de sharp/libvips, libwebp detecta el set de
# instrucciones SIMD disponible en tiempo de ejecución y cae a una ruta sin
# SIMD si el CPU no lo soporta — funciona en CPUs virtuales QEMU genéricas
# donde sharp (nativo o WASM) tira "Unsupported CPU".
RUN apt-get update && apt-get install -y --no-install-recommends webp && \
    rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm install --omit=dev --os=linux --cpu=x64 --libc=glibc

COPY --from=builder /app/dist ./dist

EXPOSE 4100
CMD ["node", "dist/server.js"]
