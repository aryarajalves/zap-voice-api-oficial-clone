import pytest
from unittest.mock import MagicMock
from services.webhooks_utils import parse_webhook_payload, replace_variables_in_string

def get_payload_with_stars():
    return {
        "event": "PURCHASE_OUT_OF_SHOPPING_CART",
        "tipo": "leitura_concluida",
        "origem": "quiz_bussola",
        "leitura_id": "20260928-164404-3054288f",
        "data_hora_brasilia": "28/09/2026, 14:15:20",
        "nome_completo": "Flavia Regina Borges Fernandes",
        "numero": "+55 (18) 99787-7100",
        "phone": "5518997877100",
        "feedback_estrelas": 5,
        "estrelas": 5,
        "stars": 5,
        "nota": 5,
        "feedback_pulou": False,
        "pulou": False,
        "pulou_avaliacao": False,
        "mensagem": "Olá, Flavia! Aqui está a sua leitura da Bússola Astrológica...",
        "quiz": {
            "area": "carreira",
            "espelho": "Estou estagnada e não sei o próximo passo",
            "quebra": "muitas"
        },
        "carta": {
            "titulo": "mostrar seu trabalho de outro jeito",
            "destaque": "Flavia, seu próximo passo começa quando você aparece antes de pedir licença."
        },
        "data": {
            "reading": {
                "leitura_id": "20260928-164404-3054288f",
                "estrelas": 5,
                "feedback_estrelas": 5,
                "feedback_pulou": False
            },
            "custom_fields": {
                "estrelas": 5,
                "feedback_estrelas": 5,
                "feedback_pulou": "Não"
            }
        }
    }

def get_payload_skipped():
    return {
        "event": "PURCHASE_OUT_OF_SHOPPING_CART",
        "tipo": "leitura_concluida",
        "origem": "quiz_bussola",
        "leitura_id": "20260928-164404-3054288f",
        "data_hora_brasilia": "28/09/2026, 14:08:03",
        "nome_completo": "Flavia Regina Borges Fernandes",
        "phone": "5518997877100",
        "feedback_estrelas": None,
        "estrelas": None,
        "stars": None,
        "nota": None,
        "feedback_pulou": True,
        "pulou": True,
        "pulou_avaliacao": True,
        "mensagem": "Olá, Flavia! Aqui está a sua leitura da Bússola Astrológica...",
        "quiz": {
            "area": "carreira"
        },
        "carta": {
            "titulo": "mostrar seu trabalho de outro jeito"
        },
        "data": {
            "reading": {
                "estrelas": None,
                "feedback_estrelas": None,
                "feedback_pulou": True
            },
            "custom_fields": {
                "estrelas": "",
                "feedback_pulou": "Sim"
            }
        }
    }

def test_parse_bussola_with_5_stars():
    payload = get_payload_with_stars()
    result = parse_webhook_payload("bussola_quiz", payload)

    assert result["feedback_filter_detected"] == "5"
    assert result["estrelas"] == "5"
    assert result["feedback_estrelas"] == "5"
    assert result["feedback_pulou"] == "Não"
    assert result["variables"]["estrelas"] == "5"
    assert result["variables"]["feedback_pulou"] == "Não"
    assert result["variables"]["feedback_filter_detected"] == "5"

def test_parse_bussola_skipped_rating():
    payload = get_payload_skipped()
    result = parse_webhook_payload("bussola_quiz", payload)

    assert result["feedback_filter_detected"] == "skipped"
    assert result["estrelas"] == ""
    assert result["feedback_pulou"] == "Sim"
    assert result["variables"]["estrelas"] == ""
    assert result["variables"]["feedback_pulou"] == "Sim"
    assert result["variables"]["feedback_filter_detected"] == "skipped"

def test_bussola_star_variable_replacement():
    payload = get_payload_with_stars()
    result = parse_webhook_payload("bussola_quiz", payload)

    template_text = "Olá {{first_name}}! Sua avaliação foi {{estrelas}} estrelas. Pulou: {{feedback_pulou}}."
    replaced = replace_variables_in_string(template_text, payload, result)

    assert "Olá Flavia!" in replaced
    assert "Sua avaliação foi 5 estrelas." in replaced
    assert "Pulou: Não." in replaced

def test_trigger_resolution_priority_specific_vs_generic():
    """
    Testa a lógica de seleção de mapeamento com prioridade específica e fallback genérico.
    """
    class MockMapping:
        def __init__(self, id, event_type, feedback_filter, product_name=None, is_active=True):
            self.id = id
            self.event_type = event_type
            self.feedback_filter = feedback_filter
            self.product_name = product_name
            self.is_active = is_active

    mappings = [
        MockMapping(id=1, event_type="leitura_concluida", feedback_filter=None),       # Genérico / Fallback
        MockMapping(id=2, event_type="leitura_concluida", feedback_filter="5"),        # Específico 5 estrelas
        MockMapping(id=3, event_type="leitura_concluida", feedback_filter="skipped"),  # Específico Pulou
    ]

    def resolve_mapping(event_type, detected_feedback):
        # 1. Tenta específico
        if detected_feedback:
            for m in mappings:
                if m.is_active and m.event_type == event_type and m.feedback_filter == str(detected_feedback):
                    return m
        # 2. Fallback genérico
        for m in mappings:
            if m.is_active and m.event_type == event_type and (not m.feedback_filter or m.feedback_filter == "all"):
                return m
        return None

    # Caso 1: 5 estrelas deve escolher Mapping #2
    resolved_5 = resolve_mapping("leitura_concluida", "5")
    assert resolved_5 is not None
    assert resolved_5.id == 2
    assert resolved_5.feedback_filter == "5"

    # Caso 2: Pulou avaliação deve escolher Mapping #3
    resolved_skip = resolve_mapping("leitura_concluida", "skipped")
    assert resolved_skip is not None
    assert resolved_skip.id == 3
    assert resolved_skip.feedback_filter == "skipped"

    # Caso 3: 4 estrelas (sem regra específica de 4) deve fazer fallback para Mapping #1
    resolved_4 = resolve_mapping("leitura_concluida", "4")
    assert resolved_4 is not None
    assert resolved_4.id == 1
    assert resolved_4 is not None
    assert resolved_4.id == 1
    assert resolved_4.feedback_filter is None

def test_feedback_matcher_ranges_and_multi_select():
    from services.utils.feedback_matcher import parse_feedback_filter_to_set, matches_feedback_filter

    # Range "1-3"
    s1 = parse_feedback_filter_to_set("1-3")
    assert s1 == {"1", "2", "3"}

    # Range "4..5"
    s2 = parse_feedback_filter_to_set("4..5")
    assert s2 == {"4", "5"}

    # Multi-select "1,2,3"
    s3 = parse_feedback_filter_to_set("1,2,3")
    assert s3 == {"1", "2", "3"}

    # Misto "skipped, 1-2"
    s4 = parse_feedback_filter_to_set("skipped, 1-2")
    assert s4 == {"skipped", "1", "2"}

    # Fallback / Genérico
    assert parse_feedback_filter_to_set(None) is None
    assert parse_feedback_filter_to_set("") is None
    assert parse_feedback_filter_to_set("all") is None

    # Matches
    assert matches_feedback_filter("1-3", "1") is True
    assert matches_feedback_filter("1-3", "2") is True
    assert matches_feedback_filter("1-3", "3") is True
    assert matches_feedback_filter("1-3", "4") is False

    assert matches_feedback_filter("4,5", "5") is True
    assert matches_feedback_filter("4,5", "4") is True
    assert matches_feedback_filter("4,5", "3") is False

    assert matches_feedback_filter("skipped", "skipped") is True
    assert matches_feedback_filter("skipped", "5") is False

def test_trigger_resolution_with_ranges_and_multi():
    from services.utils.feedback_matcher import parse_feedback_filter_to_set

    class MockMapping:
        def __init__(self, id, feedback_filter):
            self.id = id
            self.feedback_filter = feedback_filter

    mappings = [
        MockMapping(id=1, feedback_filter=None),       # Fallback
        MockMapping(id=2, feedback_filter="1-3"),      # Range 1 a 3
        MockMapping(id=3, feedback_filter="4,5"),      # 4 e 5 estrelas
        MockMapping(id=4, feedback_filter="skipped"),  # Pulou
    ]

    def resolve(detected):
        if detected:
            specific = []
            for m in mappings:
                allowed = parse_feedback_filter_to_set(m.feedback_filter)
                if allowed is not None and str(detected).strip().lower() in allowed:
                    specific.append((len(allowed), m))
            if specific:
                specific.sort(key=lambda x: x[0])
                return specific[0][1]
        for m in mappings:
            if parse_feedback_filter_to_set(m.feedback_filter) is None:
                return m
        return None

    # Notas 1, 2 e 3 devem ir para o Mapping #2 ("1-3")
    assert resolve("1").id == 2
    assert resolve("2").id == 2
    assert resolve("3").id == 2

    # Notas 4 e 5 devem ir para o Mapping #3 ("4,5")
    assert resolve("4").id == 3
    assert resolve("5").id == 3

    # Pulou deve ir para o Mapping #4 ("skipped")
    assert resolve("skipped").id == 4

if __name__ == "__main__":
    test_parse_bussola_with_5_stars()
    test_parse_bussola_skipped_rating()
    test_bussola_star_variable_replacement()
    test_trigger_resolution_priority_specific_vs_generic()
    test_feedback_matcher_ranges_and_multi_select()
    test_trigger_resolution_with_ranges_and_multi()
    print("✅ Todos os testes unitários de avaliação por estrelas passaram!")
