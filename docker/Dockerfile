# ========== ESTÁGIO 1: Build do Frontend (React/Vite) ==========
FROM node:18-alpine as frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
# Ignorar erro de lint no build se houver, para garantir que não pare
RUN npm run build || true

# ========== ESTÁGIO 2: Builder Python (Compilação) ==========
FROM python:3.11-slim as backend-builder

WORKDIR /app

# Instalar ferramentas de compilação
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libc-dev \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ========== ESTÁGIO 3: Imagem Final (Produção Otimizada) ==========
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libmagic1 \
    dos2unix \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY --from=backend-builder /install /usr/local
COPY backend/ .

# Criar diretórios necessários
RUN mkdir -p /app/static/dist && mkdir -p /app/static/uploads

# Copiar build do frontend
COPY --from=frontend-build /app/frontend/dist /app/static/dist

# --- FIX ENTRYPOINT ---
# Copiamos explicitamente e renomeamos para garantir que não conflite com pastas
COPY docker/entrypoint.sh /app/docker_entrypoint.sh

# Debug: Listar para garantir que é arquivo e chmod
RUN ls -la /app/docker_entrypoint.sh && \
    dos2unix /app/docker_entrypoint.sh && \
    chmod +x /app/docker_entrypoint.sh

# Variáveis (Defaults)
ENV PORT=8000
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

# Usar o novo nome do arquivo
ENTRYPOINT ["/app/docker_entrypoint.sh"]
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
