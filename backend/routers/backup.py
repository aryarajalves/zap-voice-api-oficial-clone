"""
Router de Backup do Banco de Dados.
Todos os endpoints são exclusivos para Super Admin.
"""

import asyncio
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File
from fastapi.responses import StreamingResponse
from botocore.exceptions import ClientError

from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from core.deps import get_db
from core.permissions import require_super_admin
from core.logger import logger
from models import User, BackupConfig, BackupMetadata
from services.backup_service import backup_service

router = APIRouter(prefix="/backup", tags=["Backup"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class BackupConfigUpdate(BaseModel):
    enabled: bool = False
    interval_type: str = Field(default="manual", pattern="^(manual|hours|days)$")
    interval_value: int = Field(default=24, ge=1, le=9999)
    retention_count: int = Field(default=30, ge=1, le=365)
    s3_folder: str = Field(default="backups/")


class BackupMetadataUpdate(BaseModel):
    is_pinned: Optional[bool] = False
    tag: Optional[str] = None


class BackupBulkDeleteRequest(BaseModel):
    filenames: list[str]



class BackupConfigResponse(BaseModel):
    enabled: bool
    interval_type: str
    interval_value: int
    retention_count: int
    s3_folder: str
    last_backup_at: Optional[datetime]
    next_backup_at: Optional[datetime]
    last_backup_filename: Optional[str]
    last_backup_status: Optional[str]
    last_backup_error: Optional[str]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# ─── Helpers ──────────────────────────────────────────────────────────────────

def get_or_create_config(db: Session) -> BackupConfig:
    """Retorna a configuração existente ou cria uma com os valores padrão."""
    config = db.query(BackupConfig).first()
    if not config:
        config = BackupConfig(
            enabled=False,
            interval_type="manual",
            interval_value=24,
            retention_count=30,
            s3_folder="backups/",
        )
        db.add(config)
        db.commit()
        db.refresh(config)
    else:
        # Retrocompatibilidade caso s3_folder esteja nulo por algum motivo
        if not config.s3_folder:
            config.s3_folder = "backups/"
            db.commit()
            db.refresh(config)
    return config


def _run_backup_job(db_url_placeholder: str, config_id: int):
    """
    Job de backup executado em thread separada (via run_in_executor).
    Abre sua própria sessão do banco para evitar conflito de threads.
    """
    from database import SessionLocal

    db = SessionLocal()
    try:
        config = db.query(BackupConfig).filter(BackupConfig.id == config_id).first()
        if not config:
            logger.error("[BACKUP] Configuração não encontrada durante o job.")
            return

        logger.info("🗄️ [BACKUP-JOB] Iniciando job de backup...")
        folder = config.s3_folder or "backups/"
        result = backup_service.run_backup(custom_prefix=folder)

        # Aplica retenção
        backup_service.apply_retention(config.retention_count, custom_prefix=folder)

        # Atualiza tracking
        now = datetime.now(timezone.utc)
        config.last_backup_at = now
        config.last_backup_filename = result["filename"]
        config.last_backup_status = "success"
        config.last_backup_error = None

        if config.enabled and config.interval_type != "manual":
            config.next_backup_at = backup_service.calculate_next_backup(
                config.interval_type, config.interval_value
            )

        db.commit()
        logger.info(f"✅ [BACKUP-JOB] Backup concluído com sucesso: {result['filename']}")

    except Exception as e:
        logger.error(f"❌ [BACKUP-JOB] Falha no backup: {e}")
        try:
            config = db.query(BackupConfig).filter(BackupConfig.id == config_id).first()
            if config:
                config.last_backup_status = "error"
                config.last_backup_error = str(e)
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


# ─── Rotas ────────────────────────────────────────────────────────────────────

@router.get("/config", response_model=BackupConfigResponse, summary="Obter Configuração de Backup")
async def get_backup_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """Retorna a configuração atual de backup agendado. Requer Super Admin."""
    config = get_or_create_config(db)
    return config


@router.put("/config", response_model=BackupConfigResponse, summary="Salvar Configuração de Backup")
async def update_backup_config(
    config_in: BackupConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """Salva a configuração de backup agendado. Requer Super Admin."""
    config = get_or_create_config(db)

    # Sanitizar o s3_folder: deve terminar com "/" e não ser vazio
    folder = config_in.s3_folder.strip() if config_in.s3_folder else "backups/"
    if not folder:
        folder = "backups/"
    if not folder.endswith("/"):
        folder += "/"
    config.s3_folder = folder

    config.enabled = config_in.enabled
    config.interval_type = config_in.interval_type
    config.interval_value = config_in.interval_value
    config.retention_count = config_in.retention_count

    # Recalcula o próximo agendamento
    if config_in.enabled and config_in.interval_type != "manual":
        config.next_backup_at = backup_service.calculate_next_backup(
            config_in.interval_type, config_in.interval_value
        )
    else:
        config.next_backup_at = None

    try:
        db.commit()
        db.refresh(config)
        logger.info(f"✅ [BACKUP] Configuração salva por {current_user.email}: enabled={config.enabled}, tipo={config.interval_type}, valor={config.interval_value}, retenção={config.retention_count}, pasta S3={config.s3_folder}")
        return config
    except Exception as e:
        db.rollback()
        logger.error(f"❌ [BACKUP] Erro ao salvar configuração: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao salvar configuração: {str(e)}")


@router.post("/manual", summary="Executar Backup Manual Imediato")
async def run_manual_backup(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """
    Dispara um backup imediato do banco de dados em background.
    Requer Super Admin.
    """
    config = get_or_create_config(db)
    config_id = config.id

    logger.info(f"🗄️ [BACKUP] Backup manual solicitado por {current_user.email}")

    # Define o status temporariamente como "running" para que o polling do frontend acompanhe
    config.last_backup_status = "running"
    config.last_backup_error = None
    db.commit()

    loop = asyncio.get_event_loop()
    background_tasks.add_task(
        lambda: loop.run_in_executor(None, _run_backup_job, "", config_id)
    )

    return {
        "message": "Backup iniciado em background. Verifique o status em alguns instantes.",
        "started_by": current_user.email,
        "started_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/list", summary="Listar Backups no S3")
async def list_backups(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """Lista todos os backups existentes no bucket S3. Requer Super Admin."""
    try:
        config = get_or_create_config(db)
        folder = config.s3_folder or "backups/"
        backups = backup_service.list_backups(custom_prefix=folder)
        
        # Enriquecer com os metadados do banco de dados (is_pinned e tag)
        filenames = [b["filename"] for b in backups]
        meta_records = db.query(BackupMetadata).filter(BackupMetadata.filename.in_(filenames)).all()
        meta_dict = {m.filename: {"is_pinned": m.is_pinned, "tag": m.tag} for m in meta_records}

        for b in backups:
            meta = meta_dict.get(b["filename"], {"is_pinned": False, "tag": None})
            b["is_pinned"] = meta["is_pinned"]
            b["tag"] = meta["tag"]

        # Ordenar: Primeiro os pinados (is_pinned = True), depois pela data decrescente
        # backups ja vêm do list_backups ordenados por created_at decrescente
        backups.sort(key=lambda x: (not x.get("is_pinned", False), x.get("created_at", "")))
        backups.reverse() # Como o booleano 'not is_pinned' inverte, ajustamos com reverse ou chaves diretas
        
        # Correção fina de ordenação robusta:
        # Queremos:
        # 1. Pinned = True, created_at decrescente
        # 2. Pinned = False, created_at decrescente
        backups.sort(key=lambda x: (1 if x.get("is_pinned", False) else 0, x.get("created_at", "")), reverse=True)

        return {"backups": backups, "total": len(backups)}
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"❌ [BACKUP] Erro ao listar backups: {e}")
        raise HTTPException(status_code=500, detail="Erro ao listar backups.")


@router.put("/metadata/{filename}", summary="Atualizar Metadados de um Backup")
async def update_backup_metadata(
    filename: str,
    payload: BackupMetadataUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """Atualiza se o backup está pinado (máximo 3) e qual a etiqueta (tag)."""
    # Se está tentando pinar, valida o limite máximo de 3
    if payload.is_pinned:
        pinned_count = db.query(BackupMetadata).filter(
            BackupMetadata.is_pinned == True,
            BackupMetadata.filename != filename
        ).count()
        if pinned_count >= 3:
            raise HTTPException(
                status_code=400,
                detail="Limite máximo de 3 backups fixados (pinados) atingido. Remova um para poder fixar este."
            )

    meta = db.query(BackupMetadata).filter(BackupMetadata.filename == filename).first()
    if not meta:
        meta = BackupMetadata(filename=filename)
        db.add(meta)

    meta.is_pinned = payload.is_pinned
    # Garante nulo caso a tag seja string vazia
    meta.tag = payload.tag.strip() if (payload.tag and payload.tag.strip()) else None

    try:
        db.commit()
        db.refresh(meta)
        return {
            "filename": meta.filename,
            "is_pinned": meta.is_pinned,
            "tag": meta.tag
        }
    except Exception as e:
        db.rollback()
        logger.error(f"❌ [BACKUP] Erro ao atualizar metadados do backup {filename}: {e}")
        raise HTTPException(status_code=500, detail="Erro ao atualizar metadados do backup.")


@router.delete("/file/{filename}", summary="Deletar Backup Específico")
async def delete_backup(
    filename: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """Remove um backup específico do S3 pelo nome do arquivo. Requer Super Admin."""
    # Verificar se o backup está pinado
    meta = db.query(BackupMetadata).filter(BackupMetadata.filename == filename).first()
    if meta and meta.is_pinned:
        raise HTTPException(
            status_code=400,
            detail="Este backup está fixado (pinado) no topo e não pode ser deletado. Desafixe-o primeiro."
        )

    try:
        config = get_or_create_config(db)
        folder = config.s3_folder or "backups/"
        backup_service.delete_backup(filename, custom_prefix=folder)
        logger.info(f"🗑️ [BACKUP] Arquivo '{filename}' deletado por {current_user.email}")
        return {"message": f"Backup '{filename}' removido com sucesso."}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"❌ [BACKUP] Erro ao deletar backup: {e}")
        raise HTTPException(status_code=500, detail="Erro ao deletar backup.")


@router.post("/restore/{filename}", summary="Restaurar Banco de Dados")
async def restore_database(
    filename: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """Restaura o banco de dados PostgreSQL a partir de um backup específico no S3. Requer Super Admin."""
    try:
        config = get_or_create_config(db)
        folder = config.s3_folder or "backups/"
        backup_service.restore_backup(filename, custom_prefix=folder)
        logger.info(f"✅ [RESTORE] Banco de dados restaurado com sucesso a partir de '{filename}' por {current_user.email}")
        return {"message": f"Banco de dados restaurado com sucesso a partir de '{filename}'."}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"❌ [RESTORE] Erro ao restaurar banco de dados: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao restaurar banco de dados.")


@router.post("/upload", summary="Enviar Backup Externo")
async def upload_backup(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """
    Faz upload de um backup de outro servidor (.dump ou .dump.gz) para o S3.
    Requer Super Admin.
    """
    if not file.filename.endswith((".dump", ".dump.gz")):
        raise HTTPException(
            status_code=400,
            detail="Arquivo inválido. Formato aceito: .dump ou .dump.gz"
        )

    try:
        config = get_or_create_config(db)
        folder = config.s3_folder or "backups/"
        result = backup_service.upload_backup(file.file, file.filename, custom_prefix=folder)
        
        # Aplica política de retenção para garantir que o upload não passe do limite
        backup_service.apply_retention(config.retention_count, custom_prefix=folder)
        
        logger.info(f"✅ [UPLOAD-BACKUP] Novo backup '{result['filename']}' enviado por {current_user.email}")
        return {
            "message": "Backup enviado com sucesso ao S3.",
            "filename": result["filename"],
            "size_bytes": result["size_bytes"]
        }
    except Exception as e:
        logger.error(f"❌ [UPLOAD-BACKUP] Erro no upload de backup: {e}")
        raise HTTPException(status_code=500, detail=f"Erro no upload de backup: {str(e)}")


@router.get("/download/{filename}", summary="Download de Backup Específico")
async def download_backup(
    filename: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """Gera o download de um backup do S3. Requer Super Admin."""
    if "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Nome de arquivo inválido.")

    try:
        config = get_or_create_config(db)
        folder = config.s3_folder or "backups/"
        s3 = backup_service._get_s3()
        s3_key = f"{folder}{filename}"
        
        try:
            response = s3.get_object(Bucket=backup_service.bucket_name, Key=s3_key)
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                raise HTTPException(status_code=404, detail="Arquivo de backup não encontrado no S3.")
            raise

        return StreamingResponse(
            response['Body'],
            media_type="application/gzip",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Length": str(response['ContentLength'])
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ [BACKUP] Erro ao fazer download de backup {filename}: {e}")
        raise HTTPException(status_code=500, detail="Erro ao processar download do backup.")


@router.post("/bulk-delete", summary="Deletar Vários Backups")
async def bulk_delete_backups(
    payload: BackupBulkDeleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """Exclui múltiplos backups do S3. Requer Super Admin. Não exclui backups fixados."""
    if not payload.filenames:
        raise HTTPException(status_code=400, detail="Nenhum arquivo especificado.")

    deleted = []
    ignored_pinned = []
    failed = []

    # Buscar metadados de pin para os arquivos especificados
    meta_records = db.query(BackupMetadata).filter(
        BackupMetadata.filename.in_(payload.filenames),
        BackupMetadata.is_pinned == True
    ).all()
    pinned_filenames = {m.filename for m in meta_records}

    config = get_or_create_config(db)
    folder = config.s3_folder or "backups/"

    for filename in payload.filenames:
        if "/" in filename or "\\" in filename:
            failed.append({"filename": filename, "error": "Nome de arquivo inválido."})
            continue

        if filename in pinned_filenames:
            ignored_pinned.append(filename)
            continue

        try:
            backup_service.delete_backup(filename, custom_prefix=folder)
            deleted.append(filename)
        except Exception as e:
            logger.error(f"❌ [BACKUP] Erro ao deletar backup {filename} em lote: {e}")
            failed.append({"filename": filename, "error": str(e)})

    return {
        "message": f"Processamento concluído. {len(deleted)} excluído(s).",
        "deleted": deleted,
        "ignored_pinned": ignored_pinned,
        "failed": failed
    }


