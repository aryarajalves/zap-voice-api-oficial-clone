import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import uuid
import pytest
from datetime import datetime, timezone
from database import SessionLocal
import models
import schemas
from routers.webhooks.dispatches import cancel_dispatch, bulk_delete_dispatches

def test_cancel_dispatch_postgres_compatibility():
    """
    Valida no PostgreSQL real que cancel_dispatch não lança:
    psycopg2.errors.UndefinedFunction: operator does not exist: character varying = uuid
    """
    db = SessionLocal()
    try:
        client = db.query(models.Client).first()
        cid = client.id if client else 1
        test_uuid = str(uuid.uuid4())
        # Criar um trigger temporário para teste de deleção
        trigger = models.ScheduledTrigger(
            client_id=cid,
            contact_name="Teste Delete Postgres",
            contact_phone="5511999999999",
            template_name="tpl_teste",
            status="queued",
            scheduled_time=datetime.now(timezone.utc),
            integration_id=test_uuid
        )
        db.add(trigger)
        db.commit()
        db.refresh(trigger)
        t_id = trigger.id

        # Executar cancel_dispatch
        res = cancel_dispatch(
            integration_id=test_uuid,
            dispatch_id=t_id,
            x_client_id=cid,
            db=db,
            current_user=None
        )
        assert res["status"] == "success"

        # Garantir que foi removido do PostgreSQL
        deleted = db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.id == t_id).first()
        assert deleted is None
    finally:
        db.close()

@pytest.mark.asyncio
async def test_bulk_delete_dispatches_postgres_compatibility():
    """
    Valida no PostgreSQL real que bulk_delete_dispatches não lança:
    psycopg2.errors.UndefinedFunction: operator does not exist: character varying = uuid
    """
    db = SessionLocal()
    try:
        client = db.query(models.Client).first()
        cid = client.id if client else 1
        test_uuid = str(uuid.uuid4())
        t1 = models.ScheduledTrigger(
            client_id=cid,
            contact_name="Teste Bulk Delete 1",
            contact_phone="5511999999991",
            template_name="tpl_teste",
            status="queued",
            scheduled_time=datetime.now(timezone.utc),
            integration_id=test_uuid
        )
        t2 = models.ScheduledTrigger(
            client_id=cid,
            contact_name="Teste Bulk Delete 2",
            contact_phone="5511999999992",
            template_name="tpl_teste",
            status="queued",
            scheduled_time=datetime.now(timezone.utc),
            integration_id=test_uuid
        )
        db.add(t1)
        db.commit()
        db.refresh(t1)
        db.add(t2)
        db.commit()
        db.refresh(t2)

        id1, id2 = t1.id, t2.id
        req = schemas.BulkDeleteRequest(ids=[id1, id2])
        res = await bulk_delete_dispatches(
            integration_id=test_uuid,
            request=req,
            x_client_id=cid,
            db=db,
            current_user=None
        )
        assert res["status"] == "success"
        assert res["deleted_count"] == 2

        remaining = db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.id.in_([id1, id2])).count()
        assert remaining == 0
    finally:
        db.close()
