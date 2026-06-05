import os                          # Lê variáveis de ambiente do sistema (.env)
import hashlib                     # Gera hash SHA256 — usado como fallback para senhas antigas
from contextvars import ContextVar  # Permite isolar o contexto da requisição por thread/task
from fastapi import Request        # Representação da requisição HTTP
from slowapi import Limiter        # Limitador de requisições — bloqueia abuso de endpoints
from core.logger import setup_logger                # Logger interno do projeto
from slowapi.util import get_remote_address         # Pega o IP de quem fez a requisição
from passlib.context import CryptContext            # Gerenciador de algoritmos de hash de senha
from datetime import datetime, timedelta, timezone  # Manipulação de datas e fusos horários
from typing import Optional                         # Permite parâmetros opcionais nas funções
from jose import jwt               # Geração e validação de tokens JWT

logger = setup_logger("security")

# Contexto global para armazenar a requisição atual de forma thread-safe
request_var: ContextVar[Request] = ContextVar("request_var")

class RequestContextMiddleware:
    """
    Middleware ASGI que captura a requisição atual do ciclo HTTP e a armazena
    em uma variável de contexto isolada, permitindo acesso dinâmico posterior.
    """
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope, receive=receive)
        token = request_var.set(request)
        try:
            await self.app(scope, receive, send)
        finally:
            request_var.reset(token)

# ── Rate Limiter ──────────────────────────────────────────────────────────────
# Lê do .env se o rate limit está habilitado (padrão: true)
# Desativa automaticamente durante testes (TESTING=true) para não interferir
RATE_LIMIT_ENABLED = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true" and os.getenv("TESTING") != "true"

# Valores de limite definidos diretamente no código
RATE_LIMIT_READ = "100/minute"
RATE_LIMIT_WRITE = "30/minute"

def get_dynamic_rate_limit() -> str:
    """
    Retorna dinamicamente o rate limit correspondente ao método HTTP da requisição.
    Se for GET (visualização), retorna o limite de leitura.
    Se for POST, PUT, DELETE, PATCH, etc., retorna o limite de escrita.
    """
    try:
        request = request_var.get()
        if request.method == "GET":
            return RATE_LIMIT_READ
        return RATE_LIMIT_WRITE
    except Exception:
        # Fallback se executado fora de um contexto de requisição
        return RATE_LIMIT_READ

limiter = Limiter(
    key_func=get_remote_address,      # Identifica cada usuário pelo IP
    default_limits=[get_dynamic_rate_limit],     # Limite dinâmico baseado no método HTTP
    enabled=RATE_LIMIT_ENABLED        # Liga/desliga conforme a variável de ambiente
)

# ── Configuração da Autenticação ──────────────────────────────────────────────
# Lê a SECRET_KEY do .env e remove aspas extras que o Portainer/Docker pode injetar
SECRET_KEY = os.getenv("SECRET_KEY", "").strip('"').strip("'").strip()

if not SECRET_KEY:
    # SECRET_KEY ausente — erro crítico, impede o servidor de subir
    logger.error("❌ SECRET_KEY não configurada no .env — o servidor não pode iniciar sem ela!")
    raise ValueError("SECRET_KEY não configurada. Adicione SECRET_KEY no .env para continuar.")
elif len(SECRET_KEY) < 32:
    # Chaves muito curtas são inseguras — lança erro e impede o servidor de subir
    raise ValueError(
        "SECRET_KEY deve ter no mínimo 32 caracteres. "
        "Gere uma chave segura com: python -c \"import secrets; print(secrets.token_urlsafe(64))\""
    )

ALGORITHM = "HS256"               # Algoritmo de assinatura do JWT (HMAC + SHA-256)
ACCESS_TOKEN_EXPIRE_MINUTES = 1440 # Token expira em 24 horas (1440 minutos)

# Configura o bcrypt como algoritmo de hash de senhas
# deprecated="auto" → migra automaticamente hashes de algoritmos antigos para bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifica se a senha digitada bate com o hash salvo no banco.
    Tenta bcrypt primeiro. Se falhar, tenta SHA256 (compatibilidade com senhas antigas).
    """
    try:
        # Recalcula o hash da senha digitada e compara com o hash do banco
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        # Fallback para SHA256 — suporta usuários criados antes da migração para bcrypt
        return hashlib.sha256(plain_password.encode()).hexdigest() == hashed_password


def get_password_hash(password: str) -> str:
    """
    Transforma a senha em texto puro em um hash bcrypt irreversível.
    Esse hash é o que fica salvo no banco — nunca a senha original.
    """
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Gera um token JWT assinado com a SECRET_KEY.
    O token carrega os dados do usuário (ex: email, role) e uma data de expiração.
    Após expirar, o token é inválido e o usuário precisa fazer login novamente.
    """
    to_encode = data.copy()  # Copia os dados para não modificar o original

    # Define quando o token vai expirar
    # Se não passou um tempo personalizado, usa o padrão de 24 horas
    expire = datetime.now(timezone.utc) + (
        expires_delta if expires_delta else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    to_encode.update({"exp": expire})  # Adiciona a data de expiração dentro do token

    # Assina e retorna o token JWT
    # jwt.encode transforma o dicionário em uma string criptografada
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
