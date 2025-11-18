# =========================
# backend/Dockerfile
# =========================

# ---- Etapa de build ----
FROM node:20-alpine AS build
WORKDIR /app

# Instala deps (prod + dev) para compilar TypeScript
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

# Prepara carpetas necesarias
RUN mkdir -p /app/.secrets \
    && mkdir -p /app/dist/public/generated

# Instala solo dependencias de producción
COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev

# Copia el build ya compilado
COPY --from=build /app/dist ./dist

# Copia estáticos si los hubiera
COPY --from=build /app/src/public ./dist/public

EXPOSE 8080

# IMPORTANTE:
# - NO seteamos GOOGLE_APPLICATION_CREDENTIALS aquí.
# - En Cloud Run usaremos la service account del servicio (ADC).
# - Si alguna vez quieres usar json en Docker local, montas el volumen
#   y pasas GOOGLE_APPLICATION_CREDENTIALS al "docker run".
CMD ["node", "dist/server.js"]
