import sys
import os
from datetime import datetime
from unittest.mock import MagicMock, patch

# Adiciona o caminho do backend para poder importar os serviços
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from services.webhooks import compute_dynamic_manychat_tag

def test_compute_dynamic_manychat_tag_with_date():
    """Testa se a tag inclui a data por padrão quando a automação está ativa."""
    mapping = MagicMock()
    mapping.manychat_tag_prefix = "promocao"
    mapping.manychat_tag_automation = True
    mapping.manychat_tag_include_date = True
    mapping.manychat_tag_rotation_day = 4  # Sexta-feira
    mapping.manychat_tag_rotation_time = "08:00"

    # Mock get_brasilia_now para retornar uma data fixa (Quinta, 2024-05-30)
    # Sexta-feira seria 2024-05-31
    mock_now = datetime(2024, 5, 30, 10, 0, 0)
    
    with patch('services.webhooks.get_brasilia_now', return_value=mock_now):
        tag = compute_dynamic_manychat_tag(mapping)
        # Como hoje é Quinta e a rotação é Sexta, deve pegar a data de amanhã (31-05-2024)
        assert tag == "promocao-31-05-2024"
        print("OK: Teste com data")

def test_compute_dynamic_manychat_tag_without_date():
    """Testa se a tag retorna apenas o prefixo quando include_date é False."""
    mapping = MagicMock()
    mapping.manychat_tag_prefix = "fixa"
    mapping.manychat_tag_automation = True
    mapping.manychat_tag_include_date = False
    mapping.manychat_tag_rotation_day = 4
    mapping.manychat_tag_rotation_time = "08:00"

    mock_now = datetime(2024, 5, 30, 10, 0, 0)
    
    with patch('services.webhooks.get_brasilia_now', return_value=mock_now):
        tag = compute_dynamic_manychat_tag(mapping)
        assert tag == "fixa"
        print("OK: Teste sem data")

def test_compute_dynamic_manychat_tag_default_behavior():
    """Testa o comportamento padrão (retrocompatibilidade)."""
    mapping = MagicMock()
    mapping.manychat_tag_prefix = "legacy"
    mapping.manychat_tag_automation = True
    mapping.manychat_tag_rotation_day = 4
    mapping.manychat_tag_rotation_time = "08:00"
    # manychat_tag_include_date não existe no objeto (getattr retorna default True)
    del mapping.manychat_tag_include_date 

    mock_now = datetime(2024, 5, 30, 10, 0, 0)
    
    with patch('services.webhooks.get_brasilia_now', return_value=mock_now):
        tag = compute_dynamic_manychat_tag(mapping)
        assert tag == "legacy-31-05-2024"
        print("OK: Teste de retrocompatibilidade")

if __name__ == "__main__":
    try:
        test_compute_dynamic_manychat_tag_with_date()
        test_compute_dynamic_manychat_tag_without_date()
        test_compute_dynamic_manychat_tag_default_behavior()
        print("\nSUCCESS: TODOS OS TESTES PASSARAM!")
    except AssertionError as e:
        print(f"\nFAIL: FALHA NO TESTE: {e}")
        exit(1)
    except Exception as e:
        print(f"\nERROR: ERRO INESPERADO: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
