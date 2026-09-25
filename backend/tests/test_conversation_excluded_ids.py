import sys
import os
import pytest
from unittest.mock import MagicMock

os.environ["SECRET_KEY"] = "test-secret-key-123456789012345678901234567890"
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

sys.modules['rabbitmq_client'] = MagicMock()
import rabbitmq_client
rabbitmq_client.rabbitmq = MagicMock()
sys.modules['config_loader'] = MagicMock()

import models
from database import SessionLocal, engine
from routers.chat.conversation_modules.conversation_filter_helpers import build_conversation_filter_query

models.Base.metadata.create_all(bind=engine)

def test_build_conversation_filter_query_with_excluded_ids():
    db = SessionLocal()
    inserted_ids = []
    try:
        client = db.query(models.Client).first()
        if not client:
            client = models.Client(name="Test Client Exclusion")
            db.add(client)
            db.commit()
            db.refresh(client)
        client_id = client.id

        # Cria 3 conversas sem fixar ID manual para evitar conflito de chave primária
        c1 = models.ChatConversation(client_id=client_id, phone="5511999990001", contact_name="Lead Excluded 1", status="open")
        c2 = models.ChatConversation(client_id=client_id, phone="5511999990002", contact_name="Lead Excluded 2", status="open")
        c3 = models.ChatConversation(client_id=client_id, phone="5511999990003", contact_name="Lead Excluded 3", status="open")
        db.add_all([c1, c2, c3])
        db.commit()
        db.refresh(c1)
        db.refresh(c2)
        db.refresh(c3)
        inserted_ids = [c1.id, c2.id, c3.id]

        # 1. Sem exclusão: todas as 3 devem estar no resultado
        q_all = build_conversation_filter_query(
            db=db,
            client_id=client_id,
            status="open",
            excluded_ids=None
        )
        all_ids = [c.id for c in q_all.all()]
        assert c1.id in all_ids
        assert c2.id in all_ids
        assert c3.id in all_ids

        # 2. Excluindo c1.id: c1 não deve estar no resultado, c2 e c3 devem estar
        q_excluded_1 = build_conversation_filter_query(
            db=db,
            client_id=client_id,
            status="open",
            excluded_ids=[c1.id]
        )
        ids_result_1 = [c.id for c in q_excluded_1.all()]
        assert c1.id not in ids_result_1
        assert c2.id in ids_result_1
        assert c3.id in ids_result_1

        # 3. Excluindo c1.id e c2.id: apenas c3 deve estar no resultado
        q_excluded_2 = build_conversation_filter_query(
            db=db,
            client_id=client_id,
            status="open",
            excluded_ids=[c1.id, c2.id]
        )
        ids_result_2 = [c.id for c in q_excluded_2.all()]
        assert c1.id not in ids_result_2
        assert c2.id not in ids_result_2
        assert c3.id in ids_result_2

    finally:
        if inserted_ids:
            db.query(models.ChatConversation).filter(models.ChatConversation.id.in_(inserted_ids)).delete(synchronize_session=False)
            db.commit()
        db.close()
