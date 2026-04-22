import sys
import os

# Define DATABASE_URL antes de importar qualquer coisa do backend
os.environ["DATABASE_URL"] = "sqlite:///./test_temp.db"

# Adiciona o diretório backend ao path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from services.bulk import render_template_body

def test_render_template_body_scenarios():
    print("🧪 Iniciando testes de renderização de template...\n")
    
    # 1. Teste básico com {{1}} e placeholder "1"
    body = "Olá {{1}}, tudo bem?"
    components = [{"type": "body", "parameters": [{"type": "text", "text": "1"}]}]
    name = "Arya"
    rendered = render_template_body(body, components, contact_name=name)
    assert rendered == "Olá Arya, tudo bem?", f"Falha 1: {rendered}"
    print("✅ Teste 1: Placeholder '1' substituído por nome real.")

    # 2. Teste com {{nome}} e {{name}}
    body = "Oi {{nome}} (ou {{name}}), seu número é {{1}}."
    components = []
    name = "João"
    rendered = render_template_body(body, components, contact_name=name)
    assert rendered == "Oi João (ou João), seu número é João.", f"Falha 2: {rendered}"
    print("✅ Teste 2: Variáveis nomeadas {{nome}} e {{name}} substituídas.")

    # 3. Teste com placeholder "1" e SEM nome de contato (deve ficar vazio)
    body = "Olá {{1}}!"
    components = [{"type": "body", "parameters": [{"type": "text", "text": "1"}]}]
    name = "1" # Representa nome não encontrado
    rendered = render_template_body(body, components, contact_name=name)
    assert rendered == "Olá !", f"Falha 3: {rendered}"
    print("✅ Teste 3: Placeholder '1' removido quando nome não está disponível.")

    # 4. Teste com variáveis reais que NÃO são "1"
    body = "Seu código é {{1}} e seu vencimento {{2}}."
    components = [
        {"type": "body", "parameters": [
            {"type": "text", "text": "XYZ-99"},
            {"type": "text", "text": "20/10"}
        ]}
    ]
    rendered = render_template_body(body, components, contact_name="Maria")
    assert rendered == "Seu código é XYZ-99 e seu vencimento 20/10.", f"Falha 4: {rendered}"
    print("✅ Teste 4: Variáveis legítimas mantidas integralmente.")

    # 5. Teste de fallback sem components
    body = "Olá {{1}}!"
    rendered = render_template_body(body, [], contact_name="Carlos")
    assert rendered == "Olá Carlos!", f"Falha 5: {rendered}"
    print("✅ Teste 5: Fallback de {{1}} funcionando sem lista de componentes.")

    print("\n🎉 Todos os testes de renderização passaram!")

if __name__ == "__main__":
    test_render_template_body_scenarios()
