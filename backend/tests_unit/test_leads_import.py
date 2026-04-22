import pytest
import os
import sys
import json
import io
import pandas as pd
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from fastapi import UploadFile

# Garante que o diretório backend está no path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import models
from database import Base
from services.leads import upsert_webhook_lead
from routers.leads import execute_import

# Configuração do banco de testes (SQLite em memória)
TEST_DATABASE_URL = "sqlite:///./test_import.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def db():
    # Cria as tabelas
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        # Limpa após o teste
        Base.metadata.drop_all(bind=engine)
        if os.path.exists("./test_import.db"):
            os.remove("./test_import.db")

@pytest.fixture
def mock_user():
    return models.User(id=1, email="test@example.com", role="admin", client_id=1)

@pytest.mark.asyncio
async def test_lead_import_from_csv(db: Session, mock_user: models.User):
    # 1. Prepare CSV content with duplicates and different formatting (9th digit)
    csv_content = (
        "Nome;WhatsApp;Correio Eletronico;Tags\n"
        "Alice;5511911111111;alice@test.com;Tag1\n"
        "Alice Updated;(11) 1111-1111;alice_new@test.com;Tag2\n" 
        "Bob;5511922222222;bob@test.com;Tag3\n"
    )
    # The second Alice row has only 8 digits (11111111) while the first has 9 (911111111).
    # Both end in 11111111. The deduplication in router should keep the first one.
    
    # 2. Mock UploadFile
    file = UploadFile(filename="test.csv", file=io.BytesIO(csv_content.encode('utf-8')))
    
    # 3. Mapping
    mapping = json.dumps({
        "name": "Nome",
        "phone": "WhatsApp",
        "email": "Correio Eletronico",
        "tags": "Tags"
    })
    
    # 4. Call execute_import
    from routers.leads import execute_import as router_execute_import
    result = await router_execute_import(
        file=file,
        mapping=mapping,
        x_client_id=1,
        db=db,
        current_user=mock_user
    )
    
    assert result["status"] == "success"
    # Router deduplication should keep only 1 Alice (first one) and 1 Bob
    assert result["imported"] == 2
    
    # Verify in DB
    # The first Alice (with 9th digit) should be the one in DB
    alice = db.query(models.WebhookLead).filter(models.WebhookLead.phone == "5511911111111").first()
    assert alice is not None
    assert alice.name == "Alice"
    
    # Verify 8-digit matching with a new hit (Webhook style)
    # Simulate a hit with only 8 digits for Alice
    from services.leads import upsert_webhook_lead
    hit_data = {"phone": "11111111", "name": "Alice Webhook", "event_type": "webhook"}
    updated_alice = upsert_webhook_lead(db, 1, "test", hit_data)
    
    # Should have matched the existing Alice
    assert updated_alice.id == alice.id
    assert updated_alice.phone == "5511911111111" # Kept original phone

    print("\n✅ Teste de Matching de 8 dígitos e Deduplicação concluído com sucesso!")

@pytest.mark.asyncio
async def test_lead_import_from_xlsx(db: Session, mock_user: models.User):
    # 1. Prepare XLSX content using pandas
    data = {
        "Full Name": ["Charlie", "Dana"],
        "Mobile": ["5511933333333", "5511944444444"],
        "Email Addr": ["charlie@test.com", "dana@test.com"],
        "Labels": ["LabelX", "LabelY"]
    }
    df = pd.DataFrame(data)
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False)
    
    xlsx_content = output.getvalue()
    
    # 2. Mock UploadFile
    file = UploadFile(filename="test.xlsx", file=io.BytesIO(xlsx_content))
    
    # 3. Mapping
    mapping = json.dumps({
        "name": "Full Name",
        "phone": "Mobile",
        "email": "Email Addr",
        "tags": "Labels"
    })
    
    # 4. Execute
    from routers.leads import execute_import as router_execute_import
    result = await router_execute_import(
        file=file,
        mapping=mapping,
        x_client_id=1,
        db=db,
        current_user=mock_user
    )
    
    assert result["status"] == "success"
    assert result["imported"] == 2
    
    # Verify in DB
    charlie = db.query(models.WebhookLead).filter(models.WebhookLead.phone == "5511933333333").first()
    assert charlie is not None
    assert charlie.name == "Charlie"
    assert "LabelX" in charlie.tags

    print("\n✅ Teste de Importação de Leads via XLSX concluído com sucesso!")
