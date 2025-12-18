# =========================
# frontend/Dockerfile
# Build: Vite + React
# Run: Nginx sirviendo /dist como SPA
# =========================

########## Etapa 1: Build con Node ##########
FROM node:20-alpine3.19 AS build
WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm ci

# Copiar código fuente
COPY . .

# Variables de entorno de build para Vite
ARG VITE_API_BASE
ARG VITE_GCS_BUCKET
ARG VITE_GCS_PREFIX
ARG VITE_SFMC_CATEGORY_ID

ENV VITE_API_BASE=${VITE_API_BASE} \
    VITE_GCS_BUCKET=${VITE_GCS_BUCKET} \
    VITE_GCS_PREFIX=${VITE_GCS_PREFIX} \
    VITE_SFMC_CATEGORY_ID=${VITE_SFMC_CATEGORY_ID}

# Log de control
RUN echo "Building frontend with:" \
    && echo "  VITE_API_BASE=$VITE_API_BASE" \
    && echo "  VITE_GCS_BUCKET=$VITE_GCS_BUCKET"

# Build de producción (Vite genera /dist)
RUN npm run build

########## Etapa 2: Runtime con Nginx ##########
FROM nginx:1.26-alpine

# SEGURIDAD: Actualizamos paquetes del sistema para parchar vulnerabilidades conocidas
RUN apk update && apk upgrade --no-cache

# Directorio donde Nginx sirve archivos estáticos
WORKDIR /usr/share/nginx/html

# Copia el build estático desde la etapa de build
COPY --from=build /app/dist ./ 

# Configuración Nginx con soporte para variables de entorno (Templates)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]