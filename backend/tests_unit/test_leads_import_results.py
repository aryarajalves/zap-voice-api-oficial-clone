import pytest
import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi import HTTPException

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import models
from database import Base
from routers.leads_import import get_import_results

TEST_DATABASE_URL = "sqlite://"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture
def mock_user():
    return models.User(id=1, email="admin@example.com", role="admin", client_id=1)

def test_get_import_results_filtering_and_status_counts(db, mock_user):
    # 1. Criar histórico de importação
    history = models.ContactImportHistory(
        id=10,
        client_id=1,
        filename="test_list.csv",
        total_rows=3,
        imported_rows=1,
        error_rows=1,
        status="completed"
    )
    db.add(history)
    db.commit()

    # 2. Criar resultados por linha
    r1 = models.ImportRowResult(import_id=10, name="Contato Novo", phone="5511999990001", status="imported")
    r2 = models.ImportRowResult(import_id=10, name="Contato Atualizado", phone="5511999990002", status="updated")
    r3 = models.ImportRowResult(import_id=10, name="Contato Rejeitado", phone="123", status="rejected_invalid_phone", reason="Telefone curto")
    db.add_all([r1, r2, r3])
    db.commit()

    # 3. Testar busca sem filtro de status (Todos)
    res_all = get_import_results(import_id=10, status=None, search=None, skip=0, limit=10, x_client_id=1, db=db, current_user=mock_user)
    assert res_all["total"] == 3
    assert len(res_all["items"]) == 3
    assert res_all["status_counts"] == {"imported": 1, "updated": 1, "rejected_invalid_phone": 1}

    # 4. Testar busca filtrando por 'imported'
    res_imp = get_import_results(import_id=10, status="imported", search=None, skip=0, limit=10, x_client_id=1, db=db, current_user=mock_user)
    assert res_imp["total"] == 1
    assert res_imp["items"][0].name == "Contato Novo"
    assert res_imp["status_counts"] == {"imported": 1, "updated": 1, "rejected_invalid_phone": 1}

    # 5. Testar busca por filtro 'rejected' (atalho que junta rejeitados)
    res_rej = get_import_results(import_id=10, status="rejected", search=None, skip=0, limit=10, x_client_id=1, db=db, current_user=mock_user)
    assert res_rej["total"] == 1
    assert res_rej["items"][0].status == "rejected_invalid_phone"

    # 6. Testar busca por texto (search)
    res_search = get_import_results(import_id=10, status=None, search="Atualizado", skip=0, limit=10, x_client_id=1, db=db, current_user=mock_user)
    assert res_search["total"] == 1
    assert res_search["items"][0].name == "Contato Atualizado"

    # 7. Testar importação não existente (404)
    with pytest.raises(HTTPException) as exc:
        get_import_results(import_id=999, status=None, search=None, skip=0, limit=10, x_client_id=1, db=db, current_user=mock_user)
    assert exc.value.status_code == 404
