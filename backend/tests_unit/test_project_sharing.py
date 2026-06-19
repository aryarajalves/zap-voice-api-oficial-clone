import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base
import models
from services.leads import upsert_webhook_lead

# Banco SQLite em memória para teste
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

def test_project_contact_sharing_and_origin(db_session):
    # 1. Criar um projeto compartilhado
    project = models.Project(name="Projeto Compartilhado Teste")
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)

    # 2. Criar dois clientes associados ao mesmo projeto
    client_a = models.Client(name="Cliente WhatsApp A", project_id=project.id)
    client_b = models.Client(name="Cliente WhatsApp B", project_id=project.id)
    db_session.add(client_a)
    db_session.add(client_b)
    db_session.commit()
    db_session.refresh(client_a)
    db_session.refresh(client_b)

    # 3. Criar um cliente isolado (sem projeto) para validar confinamento
    client_c = models.Client(name="Cliente WhatsApp Isolado", project_id=None)
    db_session.add(client_c)
    db_session.commit()
    db_session.refresh(client_c)

    # 4. Importar contato usando o Cliente A
    lead_data_a = {
        "phone": "5511999999999",
        "name": "Contato Compartilhado",
        "email": "compartilhado@teste.com",
        "event_type": "teste_importacao",
        "product_name": "Produto Alpha",
        "price": "100.00"
    }
    
    lead_a = upsert_webhook_lead(
        db=db_session,
        client_id=client_a.id,
        platform="importacao",
        parsed_data=lead_data_a
    )
    assert lead_a is not None
    assert lead_a.project_id == project.id
    assert lead_a.imported_by_client_id == client_a.id

    # 5. Tentar atualizar/inserir o MESMO contato usando o Cliente B
    # Deve atualizar o lead existente pois compartilham o projeto
    lead_data_b = {
        "phone": "5511999999999",
        "name": "Contato Compartilhado Atualizado",
        "email": "compartilhado@teste.com",
        "event_type": "teste_atualizacao",
        "product_name": "Produto Beta",
        "price": "150.00"
    }

    lead_b = upsert_webhook_lead(
        db=db_session,
        client_id=client_b.id,
        platform="importacao",
        parsed_data=lead_data_b
    )
    assert lead_b is not None
    assert lead_b.id == lead_a.id  # Deve ser o MESMO registro físico
    assert lead_b.project_id == project.id
    # O imported_by_client_id DEVE continuar sendo client_a (quem importou primeiro)
    assert lead_b.imported_by_client_id == client_a.id
    # O nome deve ter sido atualizado pela nova mesclagem
    assert lead_b.name == "Contato Compartilhado Atualizado"

    # 6. Tentar importar o mesmo número pelo Cliente C (Isolado)
    # Deve criar um novo contato em vez de mesclar
    lead_data_c = {
        "phone": "5511999999999",
        "name": "Contato Isolado C",
        "email": "isolado@teste.com",
        "event_type": "teste_importacao_isolado"
    }

    lead_c = upsert_webhook_lead(
        db=db_session,
        client_id=client_c.id,
        platform="importacao",
        parsed_data=lead_data_c
    )
    assert lead_c is not None
    assert lead_c.id != lead_a.id  # ID diferente pois é isolado
    assert lead_c.project_id is None
    assert lead_c.imported_by_client_id == client_c.id


def test_project_blocked_and_resting_sharing(db_session):
    from datetime import datetime, timedelta

    # 1. Criar um projeto compartilhado
    project = models.Project(name="Projeto Bloqueio Teste")
    db_session.add(project)
    db_session.commit()

    # 2. Criar dois clientes associados ao mesmo projeto
    client_a = models.Client(name="Cliente A", project_id=project.id)
    client_b = models.Client(name="Cliente B", project_id=project.id)
    db_session.add(client_a)
    db_session.add(client_b)
    db_session.commit()
    db_session.refresh(client_a)
    db_session.refresh(client_b)

    # 3. Criar cliente isolado
    client_c = models.Client(name="Cliente Isolado", project_id=None)
    db_session.add(client_c)
    db_session.commit()
    db_session.refresh(client_c)

    # 4. Bloquear um contato pelo Cliente A
    blocked_contact = models.BlockedContact(
        client_id=client_a.id,
        phone="5511888888888",
        name="Contato Bloqueado A",
        reason="Manual"
    )
    db_session.add(blocked_contact)
    db_session.commit()
    db_session.refresh(blocked_contact)

    # Validar propriedade do nome do autor
    assert blocked_contact.blocked_by_client_name == "Cliente A"

    # 5. Colocar um contato em repouso pelo Cliente B
    resting_contact = models.RestingContact(
        client_id=client_b.id,
        phone="5511777777777",
        name="Contato Repouso B",
        reason="Campanha",
        expires_at=datetime.utcnow() + timedelta(hours=24)
    )
    db_session.add(resting_contact)
    db_session.commit()
    db_session.refresh(resting_contact)

    # Validar propriedade do nome do autor
    assert resting_contact.resting_by_client_name == "Cliente B"

