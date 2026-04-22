import sys
import os
from sqlalchemy import func
from sqlalchemy.orm import Session

# Add current directory to path
sys.path.append(os.getcwd())

from database import SessionLocal
import models

def fix_counts():
    db: Session = SessionLocal()
    try:
        print("🔍 Starting database stats cleanup...")
        from sqlalchemy import text
        
        # 1. First, find and REMOVE duplicate MessageStatus records for the same trigger/message_id
        # This is the root cause of '📬 3' for 1 contact
        print("🛠️ Removing duplicate MessageStatus records...")
        db.execute(text("""
            DELETE FROM message_status WHERE id IN (
                SELECT id FROM (
                    SELECT id, ROW_NUMBER() OVER (PARTITION BY trigger_id, message_id ORDER BY updated_at DESC) as row_num
                    FROM message_status
                    WHERE message_id IS NOT NULL
                ) t
                WHERE t.row_num > 1
            )
        """))
        db.commit()
        
        # Get all triggers
        triggers = db.query(models.ScheduledTrigger).all()
        
        for t in triggers:
            # Recalculate from message_status
            sent = db.query(models.MessageStatus).filter(models.MessageStatus.trigger_id == t.id).count()
            delivered = db.query(models.MessageStatus).filter(
                models.MessageStatus.trigger_id == t.id,
                models.MessageStatus.status.in_(['delivered', 'read'])
            ).count()
            read = db.query(models.MessageStatus).filter(
                models.MessageStatus.trigger_id == t.id,
                models.MessageStatus.status == 'read'
            ).count()
            
            # PAÍD TEMPLATES: Delivered/Read AND message_type is TEMPLATE
            paid_templates = db.query(models.MessageStatus).filter(
                models.MessageStatus.trigger_id == t.id,
                models.MessageStatus.status.in_(['delivered', 'read']),
                models.MessageStatus.message_type == 'TEMPLATE'
            ).count()
            
            # Recalculate cost
            expected_cost = round(paid_templates * (t.cost_per_unit or 0.0), 2)
            
            needs_update = False
            if t.total_sent != sent:
                print(f"⚠️ Trigger {t.id}: Updating sent {t.total_sent} -> {sent}")
                t.total_sent = sent
                needs_update = True
            
            if (t.total_delivered or 0) != delivered:
                print(f"⚠️ Trigger {t.id}: Updating delivered {t.total_delivered} -> {delivered}")
                t.total_delivered = delivered
                needs_update = True
            
            if (t.total_paid_templates or 0) != paid_templates:
                print(f"⚠️ Trigger {t.id}: Updating paid_templates {t.total_paid_templates} -> {paid_templates}")
                t.total_paid_templates = paid_templates
                needs_update = True
                
            if abs((t.total_cost or 0.0) - expected_cost) > 0.001:
                print(f"⚠️ Trigger {t.id}: Updating cost {t.total_cost} -> {expected_cost}")
                t.total_cost = expected_cost
                needs_update = True
                
            if (t.total_read or 0) != read:
                print(f"⚠️ Trigger {t.id}: Updating read {t.total_read} -> {read}")
                t.total_read = read
                needs_update = True

            if needs_update:
                # Also ensure all delivered messages are marked as counted
                db.query(models.MessageStatus).filter(
                    models.MessageStatus.trigger_id == t.id,
                    models.MessageStatus.status.in_(['delivered', 'read'])
                ).update({"delivered_counted": True})

        db.commit()
        print("✅ Cleanup complete!")
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_counts()
