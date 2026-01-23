# ========== ESTÁGIO 1: Build do Frontend (React/Vite) ==========
FROM node:18-alpine as frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ========== ESTÁGIO 2: Builder Python (Compilação) ==========
FROM python:3.11-slim as backend-builder

WORKDIR /app

# Instalar ferramentas de compilação (gcc, etc) necessárias para instalar libs como bcrypt/cryptography
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libc-dev \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .

# Instalar dependências no diretório /install para copiar depois
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ========== ESTÁGIO 3: Imagem Final (Produção Otimizada) ==========
FROM python:3.11-slim

WORKDIR /app

# Instalar apenas dependências de runtime (FFmpeg, Libmagic)
# --no-install-recommends economiza muito espaço evitando pacotes extras
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libmagic1 \
    dos2unix \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copiar as dependências Python compiladas do estágio anterior
COPY --from=backend-builder /install /usr/local

# Copiar código fonte do backend
COPY backend/ .

# Estrutura de pastas para estáticos
RUN mkdir -p /app/static/dist && mkdir -p /app/static/uploads

# Copiar o build do frontend otimizado
COPY --from=frontend-build /app/frontend/dist /app/static/dist

# Setup do Entrypoint
COPY docker/entrypoint.sh /app/entrypoint.sh
RUN dos2unix /app/entrypoint.sh && chmod +x /app/entrypoint.sh

# Variáveis de Ambiente Padrão
ENV PORT=8000
ENV PYTHONUNBUFFERED=1
ENV VITE_API_URL="http://localhost:8000"
ENV VITE_WS_URL="ws://localhost:8000"

EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
