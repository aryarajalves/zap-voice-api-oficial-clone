"""
Router público para atualização de dados de contatos via API Key.

Endpoint: POST /api/contacts/{phone}/update
Autenticação: Bearer <api_key> (gerada no dashboard ZapVoice)
Rate Limit: 100 requisições por minuto por IP

Permite atualizar qualquer campo da tabela de contatos do cliente,
incluindo google_meet_link, meeting_at, name, inbox_id, etc.
"""

import hashlib
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.deps import get_db
from core.logger import setup_logger
from core.security import limiter

logger = setup_logger("contacts_public")

router = APIRouter(prefix="/contacts", tags=["Contacts Public API"])

# ── Campos permitidos para atualização (allowlist de segurança) ─────────────
# Adicione aqui novos campos que forem criados na tabela de contatos.
ALLOWED_CONTACT_FIELDS = {
    "name",
    "inbox_id",
    "last_interaction_at",
    "google_meet_link",
    "meeting_at",
}

# ── Schemas ──────────────────────────────────────────────────────────────────

class ContactUpdatePayload(BaseModel):
    """
    Payload genérico para atualização de contato.
    Aceita qualquer campo da tabela de contatos — campos não reconhecidos são ignorados.
    """
    name: Optional[str] = None
    inbox_id: Optional[int] = None
    last_interaction_at: Optional[datetime] = None
    google_meet_link: Optional[str] = None
    meeting_at: Optional[datetime] = None

    class Config:
        extra = "ignore"  # Ignora campos desconhecidos silenciosamente


# ── Dependência: autenticação por API Key ────────────────────────────────────

def get_client_by_api_key(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> int:
    """
    Valida o Bearer token da requisição como uma API Key do ZapVoice.
    Retorna o client_id associado à chave ou levanta 401.
    """
    import models

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API Key ausente. Forneça no header: Authorization: Bearer <api_key>"
        )

    raw_token = authorization.removeprefix("Bearer ").strip()

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API Key inválida."
        )

    # Calcula o hash SHA256 do token bruto para comparar com o banco
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

    api_key = db.query(models.ApiKey).filter(
        models.ApiKey.token_hash == token_hash,
        models.ApiKey.is_active == True
    ).first()

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API Key inválida ou revogada."
        )

    return api_key.client_id


# ── Endpoint ─────────────────────────────────────────────────────────────────

@router.post(
    "/{phone}/update",
    summary="Atualizar campos de um contato",
    description=(
        "Atualiza campos da tabela de contatos para um número específico. "
        "Ideal para salvar link do Google Meet, data/hora de reunião, nome ou qualquer "
        "informação adicional de um contato. "
        "Requer autenticação via API Key gerada no dashboard ZapVoice.\n\n"
        "**Campos suportados:** `name`, `inbox_id`, `last_interaction_at`, "
        "`google_meet_link`, `meeting_at`."
    )
)
@limiter.limit("100/minute")
def update_contact_fields(
    phone: str,
    payload: ContactUpdatePayload,
    request: Request,  # obrigatório pelo slowapi
    client_id: int = Depends(get_client_by_api_key),
    db: Session = Depends(get_db)
):
    """
    Atualiza campos de um contato na tabela personalizada do cliente.

    - O contato é identificado pelo telefone (apenas dígitos).
    - Se o contato não existir na tabela, ele é criado (UPSERT).
    - Apenas os campos enviados no payload são atualizados (PATCH semântico).
    - Campos não reconhecidos ou não permitidos são ignorados com segurança.
    """
    from config_loader import get_setting
    from sqlalchemy import text

    # Sanitiza o telefone
    clean_phone = "".join(filter(str.isdigit, str(phone)))
    if not clean_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Número de telefone inválido. Informe apenas dígitos."
        )

    # Resolve o nome da tabela do cliente
    sync_table_raw = get_setting("SYNC_CONTACTS_TABLE", "contatos_monitorados", client_id=client_id)
    safe_table = "".join(c for c in sync_table_raw if c.isalnum() or c == "_")

    # Monta o dicionário de campos a atualizar (apenas os não-None do payload)
    update_data: Dict[str, Any] = {}
    payload_dict = payload.model_dump(exclude_none=True)

    for field, value in payload_dict.items():
        if field in ALLOWED_CONTACT_FIELDS:
            update_data[field] = value

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nenhum campo válido foi fornecido para atualização."
        )

    try:
        # Garante que a tabela existe com todas as colunas (inclusive as novas)
        db.execute(text(f"""
            CREATE TABLE IF NOT EXISTS {safe_table} (
                phone VARCHAR(50) PRIMARY KEY,
                name VARCHAR(255),
                inbox_id INTEGER,
                last_interaction_at TIMESTAMP WITH TIME ZONE,
                google_meet_link TEXT,
                meeting_at TIMESTAMP WITH TIME ZONE
            )
        """))
        db.commit()

        # Migração online: garante que colunas novas existam em tabelas antigas
        for col_name, col_type in [
            ("google_meet_link", "TEXT"),
            ("meeting_at", "TIMESTAMP WITH TIME ZONE"),
        ]:
            try:
                db.execute(text(
                    f"ALTER TABLE {safe_table} ADD COLUMN IF NOT EXISTS {col_name} {col_type}"
                ))
                db.commit()
            except Exception:
                db.rollback()

        # Monta o SET clause dinamicamente (apenas campos fornecidos)
        set_clauses = ", ".join(f'"{col}" = :{col}' for col in update_data)
        insert_cols = ", ".join(f'"{col}"' for col in ["phone"] + list(update_data))
        insert_vals = ", ".join(f":{col}" for col in ["phone"] + list(update_data))

        upsert_sql = text(f"""
            INSERT INTO {safe_table} ({insert_cols})
            VALUES ({insert_vals})
            ON CONFLICT (phone) DO UPDATE SET {set_clauses}
            RETURNING phone, name, inbox_id, last_interaction_at, google_meet_link, meeting_at
        """)

        params = {"phone": clean_phone, **update_data}
        result = db.execute(upsert_sql, params).fetchone()
        db.commit()

        def fmt_dt(dt):
            if not dt:
                return None
            if isinstance(dt, str):
                return dt  # SQLite retorna string, PostgreSQL retorna datetime
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.isoformat()

        updated = {
            "phone": result[0] if result else clean_phone,
            "name": result[1] if result else None,
            "inbox_id": result[2] if result else None,
            "last_interaction_at": fmt_dt(result[3]) if result else None,
            "google_meet_link": result[4] if result else None,
            "meeting_at": fmt_dt(result[5]) if result else None,
        }

        logger.info(
            f"✅ [CONTACT-UPDATE] Contato {clean_phone} atualizado pelo client_id={client_id}. "
            f"Campos: {list(update_data.keys())}"
        )

        return {
            "status": "success",
            "message": f"Contato {clean_phone} atualizado com sucesso.",
            "updated_fields": list(update_data.keys()),
            "contact": updated
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ [CONTACT-UPDATE] Erro ao atualizar contato {clean_phone} para client_id={client_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao atualizar o contato."
        )
