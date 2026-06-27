"""
Router de Logs — Super Admin only.
Lê zapvoice_debug.log (com suporte a arquivos rotacionados dos últimos 7 dias).
"""

import os
import glob
import math
from fastapi import APIRouter, Depends, HTTPException, Query
from core.permissions import require_super_admin
from models import User
from datetime import date as DateType

router = APIRouter(prefix="/logs", tags=["Logs"])

LOG_DIR  = os.path.dirname(os.path.dirname(__file__))
LOG_FILE = os.path.join(LOG_DIR, "zapvoice_debug.log")


def _collect_log_files() -> list[str]:
    rotated = sorted(glob.glob(os.path.join(LOG_DIR, "zapvoice_debug.log.*")))
    files = rotated + ([LOG_FILE] if os.path.exists(LOG_FILE) else [])
    return files


def _file_date(path: str) -> str:
    basename = os.path.basename(path)
    if basename == "zapvoice_debug.log":
        return DateType.today().isoformat()
    return basename.replace("zapvoice_debug.log.", "")


@router.get("/available-dates", summary="Listar dias com logs disponíveis")
async def get_available_dates(current_user=Depends(require_super_admin)):
    files = _collect_log_files()
    dates = []
    for f in reversed(files):
        d = _file_date(f)
        try:
            DateType.fromisoformat(d)
            dates.append(d)
        except ValueError:
            continue
    return {"dates": dates}


@router.get("/", summary="Ler logs do servidor")
async def get_logs(
    lines: int       = Query(default=2000, ge=100, le=20000),
    date: str        = Query(default=None),
    page: int        = Query(default=1, ge=1),
    page_size: int   = Query(default=5000, ge=500, le=20000),
    current_user     = Depends(require_super_admin),
):
    """
    Sem `date`: retorna as últimas `lines` linhas de todos os arquivos.
    Com `date`: pagina o arquivo daquele dia — retorna `page_size` linhas da página `page`.
    """
    files = _collect_log_files()
    if not files:
        raise HTTPException(status_code=404, detail="Nenhum arquivo de log encontrado.")

    try:
        # ── Modo: dia específico com paginação ───────────────────────────────
        if date:
            target_file = None
            for f in files:
                if _file_date(f) == date:
                    target_file = f
                    break
            if not target_file:
                raise HTTPException(status_code=404, detail=f"Nenhum log encontrado para {date}.")

            with open(target_file, "r", encoding="utf-8", errors="replace") as f:
                all_lines = f.readlines()

            total       = len(all_lines)
            total_pages = max(1, math.ceil(total / page_size))
            page        = max(1, min(page, total_pages))
            start       = (page - 1) * page_size
            end         = min(start + page_size, total)
            page_lines  = all_lines[start:end]

            return {
                "total_lines":   total,
                "returned_lines": len(page_lines),
                "total_pages":   total_pages,
                "current_page":  page,
                "page_size":     page_size,
                "date":          date,
                "content":       "".join(page_lines),
            }

        # ── Modo: últimas N linhas (sem paginação) ───────────────────────────
        collected: list[str] = []
        total_all = 0

        for path in reversed(files):
            try:
                with open(path, "r", encoding="utf-8", errors="replace") as f:
                    file_lines = f.readlines()
                total_all += len(file_lines)
                collected = file_lines + collected
                if len(collected) >= lines:
                    break
            except Exception:
                continue

        tail    = collected[-lines:] if len(collected) > lines else collected
        content = "".join(tail)

        return {
            "total_lines":    total_all,
            "returned_lines": len(tail),
            "log_files":      len(files),
            "content":        content,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao ler log: {str(e)}")


@router.delete("/", summary="Limpar arquivo de log atual")
async def clear_logs(current_user: User = Depends(require_super_admin)):
    if not os.path.exists(LOG_FILE):
        raise HTTPException(status_code=404, detail="Arquivo de log não encontrado")
    try:
        with open(LOG_FILE, "w", encoding="utf-8") as f:
            f.write("")
        return {"message": "Log atual limpo com sucesso"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao limpar log: {str(e)}")
