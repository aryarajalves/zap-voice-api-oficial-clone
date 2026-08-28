import json
import httpx
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from core.logger import logger
import models

def translate_meta_error_message(err_msg: str, err_code: Optional[int] = None, err_subcode: Optional[int] = None) -> str:
    if not err_msg:
        return "Erro desconhecido retornado pela Meta."
    
    lower = err_msg.lower()
    
    if err_code == 131042 or err_subcode == 131042 or "131042" in lower or ("payment" in lower and any(w in lower for w in ["issue", "required", "failed", "balance", "method"])):
        return "Pendência de Pagamento: A conta da Meta possui fatura em aberto, limite atingido ou falha no método de pagamento cadastrado."
    
    if err_code == 131031 or "outstanding balance" in lower or "saldo devedor" in lower:
        return "Pendência Financeira: A conta possui saldo devedor pendente na Meta. Regularize o pagamento na BM para restabelecer os envios."
    
    if err_code == 131056 or "payment method" in lower:
        return "Falha no Método de Pagamento: O cartão de crédito cadastrado na Meta foi recusado ou não possui autorização para cobrança."
        
    if "business solution provider" in lower or err_code == 10:
        return "Permissão da Meta: O token de acesso não possui permissão de provedor ou solicitou campos restritos. Verifique as permissões 'whatsapp_business_management' no seu App da Meta."
        
    if err_code == 190 or "invalid oauth access token" in lower or "session has expired" in lower or "error validating access token" in lower or "expired" in lower:
        return "Token Expirado ou Inválido: O Token de Acesso do WhatsApp Cloud API é inválido ou expirou. Gere um novo Token de Sistema permanente no Meta Business Suite."
        
    if err_code == 100 or "unsupported get request" in lower or "does not exist" in lower or "node" in lower:
        return "Identificador Inválido: O WhatsApp Business Account ID ou ID do Telefone não existe ou não pertence a este aplicativo na Meta."
        
    if "rate limit" in lower or err_code in [4, 17]:
        return "Limite de Requisições Atingido: A API da Meta atingiu temporariamente o limite de chamadas. Aguarde alguns minutos."
        
    if "permission" in lower or "access denied" in lower or "not have permission" in lower:
        return f"Permissão Insuficiente na Meta: O Token de acesso não possui permissão para consultar esses dados da conta comercial."

    return f"Aviso retornado pela Meta (Código {err_code or 'N/A'}): {err_msg}"

class WabaPaymentService:
    @staticmethod
    def _get_client_setting(db: Session, client_id: int, key: str, default: str = "") -> str:
        cfg = db.query(models.AppConfig).filter(
            models.AppConfig.client_id == client_id,
            models.AppConfig.key == key
        ).first()
        return cfg.value.strip() if cfg and cfg.value else default

    @classmethod
    async def check_client_payment_status(
        cls,
        db: Session,
        client_id: int,
        check_type: str = "MANUAL"
    ) -> models.WabaPaymentCheck:
        """
        Executa verificação completa de saúde de pagamento e status da WABA na Meta Graph API.
        """
        wa_token = cls._get_client_setting(db, client_id, "WA_ACCESS_TOKEN")
        waba_id = cls._get_client_setting(db, client_id, "WA_BUSINESS_ACCOUNT_ID")
        phone_id = cls._get_client_setting(db, client_id, "WA_PHONE_NUMBER_ID")

        logger.info(f"🔍 [WABA_PAYMENT] Iniciando verificação de pagamento para Client ID {client_id} (Tipo: {check_type})")

        if not wa_token or not waba_id:
            record = models.WabaPaymentCheck(
                client_id=client_id,
                status="UNAVAILABLE",
                check_type=check_type,
                has_error=False,
                details="WhatsApp Business Account ID ou Token de Acesso permanente não configurados neste cliente.",
                raw_data=json.dumps({"error": "Missing credentials"})
            )
            db.add(record)
            db.commit()
            db.refresh(record)
            return record

        status = "HEALTHY"
        has_error = False
        details = "Conta comercial da Meta e pagamentos em situação regular."
        account_review_status = None
        currency = None
        payment_method_status = None
        credit_line_status = None
        raw_info: Dict[str, Any] = {}

        # 1. Consultar WABA na Graph API (Campos padrão compatíveis com qualquer token Cloud API)
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.get(
                    f"https://graph.facebook.com/v25.0/{waba_id}",
                    params={
                        "fields": "id,name,account_review_status,verification_status,currency,message_template_namespace",
                        "access_token": wa_token
                    }
                )
                waba_data = res.json()
                raw_info["waba_response"] = waba_data

                if res.status_code == 200:
                    account_review_status = waba_data.get("account_review_status", "APPROVED")
                    currency = waba_data.get("currency")
                    payment_method_status = "Vinculado na Conta Meta"

                    # Se a conta estiver desabilitada ou restrita
                    if account_review_status in ["DISABLED", "RESTRICTED", "REJECTED"]:
                        status = "PAYMENT_ISSUE"
                        has_error = True
                        details = f"A conta comercial da Meta está com restrição (Status: '{account_review_status}'). Regularize o método de pagamento ou verificação na BM."
                else:
                    err = waba_data.get("error", {})
                    err_msg = err.get("message", "Erro desconhecido ao consultar Graph API")
                    err_code = err.get("code")
                    err_subcode = err.get("error_subcode")
                    
                    translated_err = translate_meta_error_message(err_msg, err_code, err_subcode)
                    
                    # Erros específicos de pagamento na Meta
                    if err_code in [131042, 131031, 131056, 131047] or err_subcode in [131042, 131031, 131056]:
                        status = "PAYMENT_ISSUE"
                        has_error = True
                        details = translated_err
                    else:
                        status = "WARNING"
                        has_error = True
                        details = translated_err

        except Exception as e:
            logger.error(f"❌ [WABA_PAYMENT] Erro ao consultar Graph API da Meta para WABA {waba_id}: {e}")
            status = "WARNING"
            has_error = True
            details = f"Erro de conexão com os servidores da Meta: {str(e)}"
            raw_info["exception"] = str(e)

        # 2. Verificar se há registros recentes de mensagens falhando por 131042 / Payment Issue
        try:
            since_time = datetime.now(timezone.utc) - timedelta(hours=48)
            failed_payment_msgs = db.query(func.count(models.MessageStatus.id))\
                .join(models.ScheduledTrigger, models.MessageStatus.trigger_id == models.ScheduledTrigger.id)\
                .filter(
                    models.ScheduledTrigger.client_id == client_id,
                    models.MessageStatus.status == "failed",
                    models.ScheduledTrigger.created_at >= since_time,
                    or_(
                        models.MessageStatus.failure_reason.ilike("%131042%"),
                        models.MessageStatus.failure_reason.ilike("%payment%"),
                        models.MessageStatus.failure_reason.ilike("%pagamento%"),
                        models.MessageStatus.failure_reason.ilike("%billing%"),
                        models.MessageStatus.failure_reason.ilike("%outstanding balance%")
                    )
                ).scalar() or 0


            raw_info["failed_payment_msgs_last_48h"] = failed_payment_msgs
            if failed_payment_msgs > 0:
                status = "PAYMENT_ISSUE"
                has_error = True
                details = f"Alerta Crítico: {failed_payment_msgs} mensagens falharam nas últimas 48h devido a pendência ou erro de pagamento na Meta (Erro 131042)."
        except Exception as e_db:
            logger.error(f"⚠️ [WABA_PAYMENT] Erro ao verificar histórico de falhas de pagamento no banco: {e_db}")

        record = models.WabaPaymentCheck(
            client_id=client_id,
            status=status,
            check_type=check_type,
            account_review_status=account_review_status,
            currency=currency,
            payment_method_status=payment_method_status,
            credit_line_status=credit_line_status,
            has_error=has_error,
            details=details,
            raw_data=json.dumps(raw_info)
        )
        db.add(record)
        db.commit()
        db.refresh(record)

        logger.info(f"✅ [WABA_PAYMENT] Verificação concluída para Client ID {client_id}: Status={status} | Erro={has_error}")
        return record

    @classmethod
    def get_latest_payment_status(cls, db: Session, client_id: int) -> Optional[models.WabaPaymentCheck]:
        return db.query(models.WabaPaymentCheck)\
            .filter(models.WabaPaymentCheck.client_id == client_id)\
            .order_by(models.WabaPaymentCheck.checked_at.desc(), models.WabaPaymentCheck.id.desc())\
            .first()

    @classmethod
    def get_payment_checks_history(
        cls,
        db: Session,
        client_id: int,
        limit: int = 50,
        offset: int = 0
    ) -> List[models.WabaPaymentCheck]:
        return db.query(models.WabaPaymentCheck)\
            .filter(models.WabaPaymentCheck.client_id == client_id)\
            .order_by(models.WabaPaymentCheck.checked_at.desc(), models.WabaPaymentCheck.id.desc())\
            .offset(offset)\
            .limit(limit)\
            .all()

    @classmethod
    async def check_all_active_clients_payment(cls, db: Session):
        """
        Executado pelo scheduler a cada 2 horas para todos os clientes configurados.
        """
        logger.info("⏰ [WABA_PAYMENT_SCHEDULER] Iniciando ciclo de auditoria de pagamento da Meta para todos os clientes...")
        
        # Encontra todos os clients que têm WA_BUSINESS_ACCOUNT_ID configurado
        waba_configs = db.query(models.AppConfig.client_id)\
            .filter(
                models.AppConfig.key == "WA_BUSINESS_ACCOUNT_ID",
                models.AppConfig.value != "",
                models.AppConfig.value.isnot(None)
            )\
            .distinct()\
            .all()

        client_ids = [row[0] for row in waba_configs if row[0] is not None]
        logger.info(f"📊 [WABA_PAYMENT_SCHEDULER] Encontrados {len(client_ids)} clientes com WABA configurada.")

        for c_id in client_ids:
            try:
                await cls.check_client_payment_status(db, c_id, check_type="AUTOMATIC")
            except Exception as e:
                logger.error(f"❌ [WABA_PAYMENT_SCHEDULER] Erro ao verificar pagamento do cliente {c_id}: {e}")
        
        logger.info("✅ [WABA_PAYMENT_SCHEDULER] Ciclo de auditoria de pagamento finalizado.")
