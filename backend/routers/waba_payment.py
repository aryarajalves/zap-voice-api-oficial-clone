from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from sqlalchemy.orm import Session
import models
from core.deps import get_current_user, get_db, get_validated_client_id
from core.permissions import require_user
from core.logger import setup_logger
from services.waba_payment_service import WabaPaymentService

logger = setup_logger(__name__)

router = APIRouter(prefix="/waba-payment", tags=["WABA Payment Monitor"])

@router.get("/status", summary="Obtém o status de pagamento mais recente da conta WABA")
async def get_payment_status(
    client_id: int = Depends(get_validated_client_id),
    current_user: models.User = Depends(require_user),
    db: Session = Depends(get_db)
):
    latest = WabaPaymentService.get_latest_payment_status(db, client_id)
    if not latest:
        # Se nunca houve check, executa um agora
        latest = await WabaPaymentService.check_client_payment_status(db, client_id, check_type="AUTOMATIC")

    return {
        "id": latest.id,
        "client_id": latest.client_id,
        "checked_at": latest.checked_at.isoformat() if latest.checked_at else None,
        "status": latest.status,
        "check_type": latest.check_type,
        "account_review_status": latest.account_review_status,
        "currency": latest.currency,
        "payment_method_status": latest.payment_method_status,
        "credit_line_status": latest.credit_line_status,
        "has_error": latest.has_error,
        "details": latest.details
    }

@router.post("/check-now", summary="Executa uma verificação manual imediata do status de pagamento da WABA")
async def check_payment_now(
    client_id: int = Depends(get_validated_client_id),
    current_user: models.User = Depends(require_user),
    db: Session = Depends(get_db)
):
    result = await WabaPaymentService.check_client_payment_status(db, client_id, check_type="MANUAL")

    return {
        "id": result.id,
        "client_id": result.client_id,
        "checked_at": result.checked_at.isoformat() if result.checked_at else None,
        "status": result.status,
        "check_type": result.check_type,
        "account_review_status": result.account_review_status,
        "currency": result.currency,
        "payment_method_status": result.payment_method_status,
        "credit_line_status": result.credit_line_status,
        "has_error": result.has_error,
        "details": result.details
    }

@router.get("/history", summary="Lista o histórico de auditorias e verificações de pagamento da WABA")
def get_payment_history(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    client_id: int = Depends(get_validated_client_id),
    current_user: models.User = Depends(require_user),
    db: Session = Depends(get_db)
):
    checks = WabaPaymentService.get_payment_checks_history(db, client_id, limit=limit, offset=offset)

    return [
        {
            "id": c.id,
            "client_id": c.client_id,
            "checked_at": c.checked_at.isoformat() if c.checked_at else None,
            "status": c.status,
            "check_type": c.check_type,
            "account_review_status": c.account_review_status,
            "currency": c.currency,
            "payment_method_status": c.payment_method_status,
            "credit_line_status": c.credit_line_status,
            "has_error": c.has_error,
            "details": c.details
        }
        for c in checks
    ]

