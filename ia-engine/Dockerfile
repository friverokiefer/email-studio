# =========================
# ia-engine/Dockerfile
# Motor de IA (FastAPI + Uvicorn) para Cloud Run
# =========================

FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Dependencias de sistema mínimas
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias de Python
COPY requirements.txt ./

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copiamos el código de la app
COPY app ./app

# Puerto que expone el contenedor (Cloud Run usará $PORT, típicamente 8080)
ENV PORT=8080
EXPOSE 8080

# Variables de entorno típicas (se sobreescriben en Cloud Run)
ENV OPENAI_API_KEY="" \
    ANTHROPIC_API_KEY=""

# Comando de arranque
# Usamos $PORT para que funcione tanto local como en Cloud Run
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
