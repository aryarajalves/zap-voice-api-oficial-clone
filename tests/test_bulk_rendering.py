import sys
import os

# Mock environment for testing without DB
os.environ["DATABASE_URL"] = "postgresql://user:pass@localhost:5432/db"

# Adiciona o diretório backend ao path para poder importar services.bulk
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from services.utils.bulk_helpers import render_template_body

def test_render_template_body_with_name():
    body = "Olá {{1}}, tudo bem?"
    components = [{"type": "body", "parameters": [{"type": "text", "text": "João"}]}]
    rendered = render_template_body(body, components)
    assert rendered == "Olá João, tudo bem?"

def test_render_template_body_with_named_vars():
    body = "Olá {{nome}}, seu saldo é {{2}}"
    components = [
        {"type": "body", "parameters": [
            {"type": "text", "text": "Carlos"},
            {"type": "text", "text": "R$ 100,00"}
        ]}
    ]
    rendered = render_template_body(body, components, contact_name="Carlos")
    assert rendered == "Olá Carlos, seu saldo é R$ 100,00"

def test_render_template_body_with_persist_vars():
    body = "Variável 1: {{1}}, Variável 2: {{2}}"
    # var1 deve sobrescrever components se passado
    rendered = render_template_body(body, [], var1="Persistida 1", var2="Persistida 2")
    assert rendered == "Variável 1: Persistida 1, Variável 2: Persistida 2"

if __name__ == "__main__":
    try:
        test_render_template_body_with_name()
        test_render_template_body_with_named_vars()
        test_render_template_body_with_persist_vars()
        print("[OK] Testes de renderização de template aprovados!")
    except AssertionError as e:
        print(f"[FAIL] Falha no teste: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] Erro inesperado: {e}")
        sys.exit(1)
