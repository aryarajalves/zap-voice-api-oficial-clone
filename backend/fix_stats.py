from database import SessionLocal
from models import WebhookConfig, WebhookEvent
import sys

def fix_stats():
    db = SessionLocal()
    try:
        webhooks = db.query(WebhookConfig).all()
        print(f"Encontrados {len(webhooks)} webhooks para verificar.")
        
        for wb in webhooks:
            total = db.query(WebhookEvent).filter(WebhookEvent.webhook_id == wb.id).count()
            processed = db.query(WebhookEvent).filter(WebhookEvent.webhook_id == wb.id, WebhookEvent.status == 'processed').count()
            errors = db.query(WebhookEvent).filter(WebhookEvent.webhook_id == wb.id, WebhookEvent.status == 'failed').count()
            
            print(f"Webhook {wb.id} ({wb.name}):")
            print(f"  Antes -> Received: {wb.total_received}, Processed: {wb.total_processed}, Errors: {wb.total_errors}")
            print(f"  Calculado -> Received: {total}, Processed: {processed}, Errors: {errors}")
            
            wb.total_received = total
            wb.total_processed = processed
            wb.total_errors = errors
            
        db.commit()
        print("Estatísticas atualizadas com sucesso!")
        
    except Exception as e:
        print(f"Erro: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_stats()
