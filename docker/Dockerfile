# ========== ESTÁGIO 1: Build do Frontend (React/Vite) ==========
FROM node:18-alpine as frontend-build

WORKDIR /app/frontend

# Copiar arquivos de dependência
COPY frontend/package*.json ./

# Instalar dependências
RUN npm install

# Copiar todo o código fonte do frontend
COPY frontend/ ./

# Gerar o build de produção (cria pasta 'dist')
RUN npm run build


# ========== ESTÁGIO 2: Backend (FastAPI) e Servidor Final ==========
FROM python:3.11-slim

WORKDIR /app

# Instalar dependências do sistema
# ffmpeg: Necessário para conversão de áudio/vídeo
# gcc, libc-dev: Necessários para compilar certas libs Python
RUN apt-get update && apt-get install -y \
    ffmpeg \
    gcc \
    libmagic1 \
    dos2unix \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements e instalar dependências Python
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código fonte do backend
COPY backend/ .

# Preparar estrutura de pastas para arquivos estáticos
RUN mkdir -p /app/static/dist
RUN mkdir -p /app/static/uploads

# Copiar o build do frontend gerado no Estágio 1
# Colocamos dentro de static/dist que é onde o main.py espera
COPY --from=frontend-build /app/frontend/dist /app/static/dist

# Variáveis de Ambiente (Valores padrão, devem ser sobrescritos no run)
ENV PORT=8000
ENV DATABASE_URL=sqlite:///./sql_app.db

# Expor a porta
EXPOSE 8000

# Comando para iniciar o servidor
# Definir Entrypoint script
COPY docker/entrypoint.sh /app/entrypoint.sh
RUN dos2unix /app/entrypoint.sh && chmod +x /app/entrypoint.sh

# Variáveis padrão que o Entrypoint vai ler
ENV VITE_API_URL="http://localhost:8000"
ENV VITE_WS_URL="ws://localhost:8000"

# Usar o script como entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]

# Comando original passado como argumento para o entrypoint
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
