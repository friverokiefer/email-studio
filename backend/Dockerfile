# =========================
# backend/Dockerfile
# =========================

# ---- Etapa de build ----
FROM node:20-alpine AS build
WORKDIR /app

# Instala deps (prod + dev) para poder compilar TypeScript
COPY package*.json ./
RUN npm ci

# Copia el código fuente y compila
COPY . .
RUN npm run build

# ---- Etapa runtime (producción) ----
FROM node:20-alpine
WORKDIR /app

# Entorno básico del servidor
ENV NODE_ENV=production
ENV PORT=8080

# Ruta que tu app espera para las credenciales de GCP
ENV GOOGLE_APPLICATION_CREDENTIALS=/app/.secrets/service-account.json

# Prepara carpeta para secretos y para assets generados en runtime
RUN mkdir -p /app/.secrets \
    && mkdir -p /app/dist/public/generated

# Instala solo dependencias de producción
COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev

# Copia el build ya compilado
COPY --from=build /app/dist ./dist

# 🔑 Asegura que los estáticos de src/public existan en la imagen final
COPY --from=build /app/src/public ./dist/public

EXPOSE 8080

# Las credenciales se montan en runtime, por ejemplo:
#   -v "$PWD/.secrets:/app/.secrets:ro"
CMD ["node", "dist/server.js"]
