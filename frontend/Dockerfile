# =========================
# frontend/Dockerfile
# Build: Vite + React
# Run: Nginx sirviendo /dist como SPA
# =========================

########## Etapa 1: Build con Node ##########
FROM node:20-alpine AS build
WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm ci

# Copiar código fuente
COPY . .

# Variables de entorno de build para Vite.
# Estas llegan desde:
# - docker-compose.yml (local)
# - cloudbuild.yaml (Cloud Build)
ARG VITE_API_BASE
ARG VITE_GCS_BUCKET
ARG VITE_GCS_PREFIX
ARG VITE_SFMC_CATEGORY_ID

ENV VITE_API_BASE=${VITE_API_BASE} \
    VITE_GCS_BUCKET=${VITE_GCS_BUCKET} \
    VITE_GCS_PREFIX=${VITE_GCS_PREFIX} \
    VITE_SFMC_CATEGORY_ID=${VITE_SFMC_CATEGORY_ID}

# Log de control para verificar que llegan bien las vars en Cloud Build
RUN echo "Building frontend with:" \
    && echo "  VITE_API_BASE=$VITE_API_BASE" \
    && echo "  VITE_GCS_BUCKET=$VITE_GCS_BUCKET" \
    && echo "  VITE_GCS_PREFIX=$VITE_GCS_PREFIX" \
    && echo "  VITE_SFMC_CATEGORY_ID=$VITE_SFMC_CATEGORY_ID"

# Build de producción (Vite genera /dist)
RUN npm run build

########## Etapa 2: Runtime con Nginx ##########
FROM nginx:stable-alpine

# Directorio donde Nginx sirve archivos estáticos
WORKDIR /usr/share/nginx/html

# Copia el build estático desde la etapa de build
COPY --from=build /app/dist ./ 

# Config de Nginx para SPA (redirige todo a index.html)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
