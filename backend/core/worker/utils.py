import json
import logging
from sqlalchemy.orm import Session
from sqlalchemy import text

logger = logging.getLogger("Worker.Utils")

async def update_node_history_extra(db: Session, trigger_id: int, node_id: str, field: str, value: str):
    """
    Updates a specific field inside the 'extra' JSONB object of a node in execution_history.
    """
    try:
        sql = text("""
            UPDATE scheduled_triggers 
            SET execution_history = (
                SELECT jsonb_agg(
                    CASE 
                        WHEN (elem->>'node_id') = :node_id THEN 
                            jsonb_set(
                                jsonb_set(elem, '{extra}', COALESCE(elem->'extra', '{}'::jsonb), true),
                                ARRAY['extra', :field], :val, true
                            )
                        ELSE elem 
                    END
                )
                FROM jsonb_array_elements(COALESCE(execution_history, '[]'::jsonb)) AS elem
            )
            WHERE id = :trigger_id
        """)
        
        db.execute(sql, {
            "node_id": node_id, 
            "field": field,
            "val": json.dumps(value), 
            "trigger_id": trigger_id
        })
        db.commit()
    except Exception as e:
        logger.error(f"❌ [DB UPDATE] Failed to update node history extra ({field}): {e}")
        db.rollback()

async def update_node_memory_status(db: Session, trigger_id: int, node_id: str, status: str):
    """Wrapper para update_node_history_extra focado em status de memória."""
    await update_node_history_extra(db, trigger_id, node_id, "memory_status", status)
