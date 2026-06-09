import sys
import os

# Define DATABASE_URL antes de importar qualquer coisa do backend
os.environ["DATABASE_URL"] = "sqlite:///./test_temp.db"

# Adiciona o diretório backend ao path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from services.webhooks_utils import parse_webhook_payload, replace_variables_in_string
from services.utils.bulk_helpers import render_template_body, sanitize_template_components
from core.engine.utils import apply_vars

# Mock simplificado do trigger para testar apply_vars
class MockTrigger:
    def __init__(self, contact_name, contact_phone="", product_name="", template_components=None, processed_data=None):
        self.contact_name = contact_name
        self.contact_phone = contact_phone
        self.product_name = product_name
        self.template_components = template_components
        self.processed_data = processed_data

def test_webhook_parsing_first_name():
    print("🧪 Testando parse_webhook_payload para extração do primeiro nome...\n")
    
    # 1. Payload típico de webhook com nome completo
    payload = {
        "name": "João da Silva",
        "phone": "5511999999999",
        "email": "joao@email.com"
    }
    result = parse_webhook_payload("elementor", payload)
    assert result["name"] == "João da Silva"
    assert result["first_name"] == "João"
    
    # 2. Payload com nome contendo espaços extras
    payload_spaces = {
        "name": "   Maria   Eduarda   Santos ",
        "phone": "5511988888888"
    }
    result_spaces = parse_webhook_payload("elementor", payload_spaces)
    assert result_spaces["first_name"] == "Maria"
    
    # 3. Payload sem nome ou com nome vazio
    payload_empty = {
        "phone": "5511977777777"
    }
    result_empty = parse_webhook_payload("elementor", payload_empty)
    assert result_empty["first_name"] == ""
    
    print("✅ Sucesso: parse_webhook_payload extraiu o primeiro nome corretamente.")

def test_webhook_replace_variables_first_name():
    print("🧪 Testando replace_variables_in_string com primeiro nome...\n")
    
    payload = {
        "name": "Carlos Eduardo",
        "phone": "5511966666666"
    }
    parsed_data = {
        "name": "Carlos Eduardo",
        "first_name": "Carlos",
        "phone": "5511966666666"
    }
    
    # Testando com {{primeiro_nome}}
    text1 = "Olá {{primeiro_nome}}, bem-vindo!"
    replaced1 = replace_variables_in_string(text1, payload, parsed_data)
    assert replaced1 == "Olá Carlos, bem-vindo!"
    
    # Testando com {{first_name}}
    text2 = "Hello {{first_name}}!"
    replaced2 = replace_variables_in_string(text2, payload, parsed_data)
    assert replaced2 == "Hello Carlos!"
    
    # Testando fallback se first_name estiver ausente no parsed_data mas name esteja presente
    parsed_data_fallback = {
        "name": "Ana Maria Braga"
    }
    text3 = "Oi {{primeiro_nome}}! Seu nome é {{name}}."
    replaced3 = replace_variables_in_string(text3, {}, parsed_data_fallback)
    assert replaced3 == "Oi Ana! Seu nome é Ana Maria Braga."
    
    print("✅ Sucesso: replace_variables_in_string processou variáveis de primeiro nome com fallback.")

def test_bulk_helpers_first_name():
    print("🧪 Testando bulk_helpers com primeiro nome...\n")
    
    # 1. render_template_body
    body = "Olá {{primeiro_nome}} ({{first_name}}), seu código é {{1}}."
    components = [{"type": "body", "parameters": [{"type": "text", "text": "XYZ-123"}]}]
    rendered = render_template_body(body, components, contact_name="Arya Stark")
    assert rendered == "Olá Arya (Arya), seu código é XYZ-123."
    
    # 2. sanitize_template_components
    components_to_sanitize = [
        {
            "type": "body",
            "parameters": [
                {"type": "text", "text": "Olá {{primeiro_nome}}!"},
                {"type": "text", "text": "Hi {{first_name}}!"}
            ]
        }
    ]
    sanitized = sanitize_template_components(components_to_sanitize, contact_name="Gabriel Jesus")
    body_params = sanitized[0]["parameters"]
    assert body_params[0]["text"] == "Olá Gabriel!"
    assert body_params[1]["text"] == "Hi Gabriel!"
    
    print("✅ Sucesso: bulk_helpers substituíram primeiro nome corretamente.")

def test_engine_apply_vars_first_name():
    print("🧪 Testando apply_vars do Funnel Engine com primeiro nome...\n")
    
    trigger = MockTrigger(contact_name="Pedro Alvares Cabral", contact_phone="5521999998888")
    
    # Substituição de {{primeiro_nome}}
    text1 = "Olá {{primeiro_nome}}, confirmamos seu contato no telefone {{telefone}}."
    replaced1 = apply_vars(text1, trigger, {})
    assert replaced1 == "Olá Pedro, confirmamos seu contato no telefone 5521999998888."
    
    # Substituição de {{first_name}}
    text2 = "Hello {{first_name}}!"
    replaced2 = apply_vars(text2, trigger, {})
    assert replaced2 == "Hello Pedro!"
    
    # Substituição de {{nome}} (completo)
    text3 = "Nome completo: {{nome}}"
    replaced3 = apply_vars(text3, trigger, {})
    assert replaced3 == "Nome completo: Pedro Alvares Cabral"
    
    print("✅ Sucesso: apply_vars resolveu primeiro_nome e first_name com base no contact_name.")

def test_engine_apply_vars_lead_additional_fields_and_custom_variables():
    print("🧪 Testando apply_vars do Funnel Engine com variáveis adicionais e customizadas do WebhookLead...\n")
    from database import SessionLocal, Base, engine
    import models
    from datetime import datetime, timezone
    
    # Garantir que a tabela webhook_leads existe no banco de teste
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Limpar registros anteriores de teste
        db.query(models.ScheduledTrigger).delete()
        db.query(models.WebhookLead).delete()
        db.commit()
        
        # 1. Criar o Lead no banco
        lead = models.WebhookLead(
            client_id=1,
            name="João da Silva",
            phone="5511999999999",
            email="joaodasilva@email.com",
            platform="hotmart",
            payment_method="pix",
            price="197.00",
            variables={"chave_secreta": "abracadabra", "cupom": "DESCONTO10"}
        )
        db.add(lead)
        db.commit()
        
        # 2. Criar o Trigger e manter na sessão ativa
        trigger = models.ScheduledTrigger(
            client_id=1,
            contact_name="João da Silva",
            contact_phone="5511999999999",
            scheduled_time=datetime.now(timezone.utc)
        )
        db.add(trigger)
        db.commit()
        
        # Recarregar trigger da sessão ativa
        db.refresh(trigger)
        
        # Testar substituição dos campos padrão e das variáveis customizadas
        text = "Olá {{nome}}, seu email é {{email}} na plataforma {{plataforma}} ({{platform}}). Pagou via {{metodo_pagamento}} o valor de {{preco}} ({{price}}). Seu cupom é {{cupom}} e a chave é {{chave_secreta}}."
        replaced = apply_vars(text, trigger, {})
        
        print(f"Texto substituído: {replaced}")
        
        assert "joaodasilva@email.com" in replaced
        assert "hotmart" in replaced
        assert "pix" in replaced
        assert "197.00" in replaced
        assert "DESCONTO10" in replaced
        assert "abracadabra" in replaced
        
        print("✅ Sucesso: apply_vars resolveu campos padrão e variáveis customizadas do WebhookLead com base no telefone.")
    finally:
        db.close()

if __name__ == "__main__":
    test_webhook_parsing_first_name()
    test_webhook_replace_variables_first_name()
    test_bulk_helpers_first_name()
    test_engine_apply_vars_first_name()
    test_engine_apply_vars_lead_additional_fields_and_custom_variables()
    print("🎉 Todos os testes de primeiro nome e variáveis de lead passaram com sucesso!")
