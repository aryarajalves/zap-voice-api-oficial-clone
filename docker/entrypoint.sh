#!/bin/sh

# Refreshed entrypoint to fix exec format error
# Define os caminhos
DIST_DIR="/app/static/dist"
CONFIG_FILE="$DIST_DIR/env-config.js"

# Verifica se o diretório existe
if [ ! -d "$DIST_DIR" ]; then
    echo "⚠️  Diretório $DIST_DIR não encontrado. Criando..."
    mkdir -p "$DIST_DIR"
fi

# Pega valores das variáveis de ambiente (ou usa valores padrão)
# Nota: VITE_API_URL é o nome da var no docker-compose que vamos usar
# Nota: Aceita tanto VITE_API_URL quanto API_URL
API_URL="${API_URL:-${VITE_API_URL:-http://localhost:8000}}"
WS_URL="${WS_URL:-${VITE_WS_URL:-ws://localhost:8000}}"

# Remove aspas se existirem (comum ao copiar do .env para o Portainer)
API_URL=$(echo "$API_URL" | sed 's/^"//;s/"$//' | sed "s/^'//;s/'$//" )
WS_URL=$(echo "$WS_URL" | sed 's/^"//;s/"$//' | sed "s/^'//;s/'$//" )

echo "🔧 Gerando configuração dinâmica para o Frontend..."
echo "  API_URL: $API_URL"
echo "  WS_URL: $WS_URL"

# Cria o arquivo env-config.js
cat <<EOF > "$CONFIG_FILE"
window._env_ = {
  API_URL: "$API_URL",
  WS_URL: "$WS_URL"
};
EOF

echo "✅ Arquivo $CONFIG_FILE gerado com sucesso!"

# Criar banco de dados se não existir (somente se DATABASE_URL estiver definido)
if [ -n "$DATABASE_URL" ]; then
    echo "🗄️  Verificando/criando banco de dados PostgreSQL..."
    python scripts/database/create_database.py || echo "⚠️  Aviso: Não foi possível criar o banco automaticamente. Certifique-se de que ele existe."
    echo "🏗️  Aplicando migrações de esquema..."
    python scripts/database/update_schema.py || echo "⚠️  Aviso: Falha ao aplicar migrações de esquema."
fi

# Inicia a aplicação original (uvicorn)
echo "🚀 Iniciando Backend..."
exec "$@"
