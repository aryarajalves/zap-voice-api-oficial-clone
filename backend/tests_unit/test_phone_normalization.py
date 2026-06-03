"""
Testes unitários para as funções auxiliares de normalização de phone em schedules.py.
Valida os cenários de comparação flexível entre phones com formatos diferentes.
"""
import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ["DATABASE_URL"] = "sqlite://"


def get_helpers():
    """Importa as funções diretamente do módulo routers.schedules."""
    from routers.schedules import normalize_phone, phones_match, is_in_exclusions
    return normalize_phone, phones_match, is_in_exclusions


class TestNormalizePhone:
    def test_remove_plus(self):
        _, _, _ = get_helpers()
        normalize_phone, _, _ = get_helpers()
        assert normalize_phone("+5511999999999") == "5511999999999"

    def test_remove_spaces_and_dashes(self):
        normalize_phone, _, _ = get_helpers()
        # +55 (85) 9 9999-9999 → apenas dígitos: 5585999999999 (13 dígitos)
        assert normalize_phone("+55 (85) 9 9999-9999") == "5585999999999"

    def test_only_digits(self):
        normalize_phone, _, _ = get_helpers()
        assert normalize_phone("5511999999999") == "5511999999999"

    def test_empty(self):
        normalize_phone, _, _ = get_helpers()
        assert normalize_phone("") == ""

    def test_none(self):
        normalize_phone, _, _ = get_helpers()
        assert normalize_phone(None) == ""


class TestPhonesMatch:
    def test_exact_match(self):
        _, phones_match, _ = get_helpers()
        assert phones_match("5511999999999", "5511999999999") is True

    def test_with_and_without_plus(self):
        _, phones_match, _ = get_helpers()
        assert phones_match("+5511999999999", "5511999999999") is True

    def test_different_numbers(self):
        _, phones_match, _ = get_helpers()
        assert phones_match("5511999999999", "5521888888888") is False

    def test_empty_phone(self):
        _, phones_match, _ = get_helpers()
        assert phones_match("", "5511999999999") is False

    def test_suffix_match_ddi(self):
        """
        Cenário real: exclusion_list tem '5511999990001' (com DDI 55)
        e Chatwoot retorna '+55119999990001' normalizado para '55119999990001'.
        O número local sem DDI '11999990001' é sufixo do número internacional.
        """
        _, phones_match, _ = get_helpers()
        # Com DDI termina com o número local
        assert phones_match("5511999990001", "11999990001") is True
        assert phones_match("11999990001", "5511999990001") is True


class TestIsInExclusions:
    def test_exact_match_in_set(self):
        _, _, is_in_exclusions = get_helpers()
        exclusions = {"5511999999999", "5521888888888"}
        assert is_in_exclusions("5511999999999", exclusions) is True

    def test_not_in_set(self):
        _, _, is_in_exclusions = get_helpers()
        exclusions = {"5511999999999"}
        assert is_in_exclusions("5521888888888", exclusions) is False

    def test_with_plus_format(self):
        """Phone retornado do Chatwoot com + deve bater com exclusão sem +"""
        _, _, is_in_exclusions = get_helpers()
        exclusions = {"5511999999999"}
        assert is_in_exclusions("+5511999999999", exclusions) is True

    def test_suffix_match_cenario_real(self):
        """
        Cenário real do bug reportado:
        - Usuário adicionou '5511999990001' (com DDI) ao exclusion_list
        - Chatwoot retornou phone normalizado como '11999990001' (sem DDI)
        - Deve ser detectado como excluído
        """
        _, _, is_in_exclusions = get_helpers()
        # Com DDI no exclusion_list, sem DDI vindo do Chatwoot
        exclusions = {"5511999990001"}
        assert is_in_exclusions("11999990001", exclusions) is True

    def test_suffix_match_inverso(self):
        """O inverso: exclusion_list tem número sem DDI, Chatwoot retorna com DDI"""
        _, _, is_in_exclusions = get_helpers()
        exclusions = {"11999990001"}
        assert is_in_exclusions("5511999990001", exclusions) is True

    def test_empty_exclusions(self):
        _, _, is_in_exclusions = get_helpers()
        assert is_in_exclusions("5511999999999", set()) is False

    def test_empty_phone(self):
        _, _, is_in_exclusions = get_helpers()
        exclusions = {"5511999999999"}
        assert is_in_exclusions("", exclusions) is False
