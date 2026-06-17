import pytest
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import models
from services.leads import upsert_webhook_lead

@pytest.fixture
def db():
    from database import SessionLocal, engine
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_multi_tag_and_removal(db: Session):
    client_id = 1
    phone = "5511988887777"
    
    # 1. Create a lead with initial tags
    initial_data = {"phone": phone, "name": "Test Tag", "event_type": "initial"}
    lead = upsert_webhook_lead(db, client_id, "test", initial_data, tag="TagA, TagB")
    
    assert lead is not None
    assert "TagA" in lead.tags
    assert "TagB" in lead.tags
    
    # 2. Update adding more tags (comma separated) and removing one
    update_data = {"phone": phone, "name": "Test Tag Updated", "event_type": "update"}
    # Add TagC, TagD and Remove TagA
    updated_lead = upsert_webhook_lead(db, client_id, "test", update_data, tag="TagC, TagD", tags_to_remove="TagA")
    
    tags = [t.strip() for t in updated_lead.tags.split(",")]
    assert "TagA" not in tags
    assert "TagB" in tags
    assert "TagC" in tags
    assert "TagD" in tags
    
    # 3. Test removal of multiple tags
    final_data = {"phone": phone, "name": "Test Tag Final", "event_type": "final"}
    # Remove TagB and TagC
    final_lead = upsert_webhook_lead(db, client_id, "test", final_data, tags_to_remove="TagB, TagC")
    
    final_tags = [t.strip() for t in final_lead.tags.split(",")]
    assert "TagB" not in final_tags
    assert "TagC" not in final_tags
    assert "TagD" in final_tags
    
    # 4. Test precedence: Removal must prevail if same tag is in both lists
    precedence_data = {"phone": phone, "name": "Test Tag Precedence", "event_type": "precedence"}
    # Add TagE, TagF and Remove TagE
    final_with_precedence = upsert_webhook_lead(db, client_id, "test", precedence_data, tag="TagE, TagF", tags_to_remove="TagE")
    
    final_precedence_tags = [t.strip() for t in final_with_precedence.tags.split(",")]
    assert "TagE" not in final_precedence_tags # REMOVE WIN!
    assert "TagF" in final_precedence_tags
    
    print("\n✅ Teste de Precedência de Remoção de Etiquetas concluído com sucesso!")

def test_clean_bracket_and_quote_tags(db: Session):
    client_id = 1
    phone = "5511977776666"
    
    # Test with brackets and quotes as input
    data = {"phone": phone, "name": "Bracket Test", "event_type": "bracket_test"}
    lead = upsert_webhook_lead(
        db, client_id, "test", data, 
        tag='["tag-a", "tag-b", "tag-c"]'
    )
    
    tags = [t.strip() for t in lead.tags.split(",")]
    assert "tag-a" in tags
    assert "tag-b" in tags
    assert "tag-c" in tags
    assert "[" not in lead.tags
    assert "]" not in lead.tags
    assert '"' not in lead.tags
    
    # Test with mixed format/brackets without valid json but manual brackets/quotes
    data_mixed = {"phone": phone, "name": "Bracket Test Mixed", "event_type": "bracket_test_mixed"}
    lead_mixed = upsert_webhook_lead(
        db, client_id, "test", data_mixed, 
        tag="[tag-d, 'tag-e']"
    )
    
    tags_mixed = [t.strip() for t in lead_mixed.tags.split(",")]
    assert "tag-d" in tags_mixed
    assert "tag-e" in tags_mixed
    
    print("\n✅ Teste de Limpeza de Etiquetas com Colchetes e Aspas concluído com sucesso!")

if __name__ == "__main__":
    # This block allows running the test directly if needed
    pass
