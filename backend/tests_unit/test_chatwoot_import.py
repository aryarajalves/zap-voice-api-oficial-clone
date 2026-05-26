import pytest
import os
import sys
from unittest.mock import AsyncMock, patch, MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from fastapi import BackgroundTasks

# Garante que o diretório backend está no path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import models
from database import Base

# Configuração do banco de testes (SQLite em memória)
TEST_DATABASE_URL = "sqlite://"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture
def mock_user():
    return models.User(id=1, email="test@example.com", role="admin", client_id=1)

@pytest.mark.asyncio
@patch("routers.leads.ChatwootClient")
@patch("routers.leads.upsert_webhook_lead")
async def test_run_chatwoot_import(mock_upsert, mock_chatwoot_client_class, db):
    # Configura os mocks
    mock_cw = AsyncMock()
    mock_chatwoot_client_class.return_value = mock_cw
    
    # Mocking contacts returning from Chatwoot
    mock_cw.get_contacts_by_label.return_value = [
        {
            "id": 123,
            "name": "Maria Teste",
            "phone_number": "+5585999999999",
            "email": "maria@teste.com"
        },
        {
            "id": 124,
            "name": "João Teste",
            "phone_number": "5585888888888",
            "email": None
        }
    ]
    
    mock_cw.get_contact_labels.return_value = ["VIP", "Lead"]
    
    # Substituir SessionLocal por TestingSessionLocal no escopo de run_chatwoot_import
    with patch("database.SessionLocal", return_value=db):
        from routers.leads import run_chatwoot_import
        # Executa a função do background task
        await run_chatwoot_import(
            client_id=1,
            label="etiqueta-teste",
            import_all_tags=True,
            custom_tag="custom-tag"
        )
    
    # Verifica se buscou os contatos com a etiqueta correta
    mock_cw.get_contacts_by_label.assert_called_once_with("etiqueta-teste")
    
    # Verifica se os labels do contato foram obtidos
    mock_cw.get_contact_labels.assert_any_call(123)
    mock_cw.get_contact_labels.assert_any_call(124)
    
    # Verifica se upsert_webhook_lead foi chamado para salvar
    assert mock_upsert.call_count == 2
    
    # Primeiro contato: Maria Teste
    first_call_args = mock_upsert.call_args_list[0]
    assert first_call_args[1]["parsed_data"]["phone"] == "5585999999999"
    assert first_call_args[1]["parsed_data"]["name"] == "Maria Teste"
    
    tags_maria = first_call_args[1]["tag"]
    assert "etiqueta-teste" in tags_maria
    assert "VIP" in tags_maria
    assert "custom-tag" in tags_maria

@pytest.mark.asyncio
@patch("routers.leads.ChatwootClient")
@patch("routers.leads.upsert_webhook_lead")
async def test_run_chatwoot_import_without_all_tags(mock_upsert, mock_chatwoot_client_class, db):
    # Configura os mocks
    mock_cw = AsyncMock()
    mock_chatwoot_client_class.return_value = mock_cw
    
    mock_cw.get_contacts_by_label.return_value = [
        {
            "id": 123,
            "name": "Maria Teste",
            "phone_number": "+5585999999999",
            "email": "maria@teste.com"
        }
    ]
    
    with patch("database.SessionLocal", return_value=db):
        from routers.leads import run_chatwoot_import
        # Executa com import_all_tags=False
        await run_chatwoot_import(
            client_id=1,
            label="etiqueta-teste",
            import_all_tags=False,
            custom_tag=None
        )
    
    # Verifica se NÃO chamou get_contact_labels
    mock_cw.get_contact_labels.assert_not_called()
    
    # Verifica se salvou apenas com a tag de filtro
    assert mock_upsert.call_count == 1
    call_args = mock_upsert.call_args
    assert call_args[1]["tag"] == "etiqueta-teste"

@pytest.mark.asyncio
async def test_api_route_chatwoot_import(mock_user):
    from routers.leads import import_leads_from_chatwoot, ChatwootImportRequest
    
    bg_tasks = MagicMock(spec=BackgroundTasks)
    request = ChatwootImportRequest(
        label="minha-tag",
        import_all_tags=True,
        custom_tag="nova-tag"
    )
    
    response = await import_leads_from_chatwoot(
        request=request,
        background_tasks=bg_tasks,
        x_client_id=1,
        current_user=mock_user
    )
    
    assert response["status"] == "success"
    assert "iniciada em segundo plano" in response["message"]
    # Verifica se a task foi enfileirada no BackgroundTasks
    bg_tasks.add_task.assert_called_once()
