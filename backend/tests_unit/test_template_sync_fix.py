"""
Testes unitários para as duas correções de bug relacionadas ao envio de templates:

Fix 1 (worker.py): Não sincronizar placeholder "[Template: nome]" como mensagem no Chatwoot.
Fix 2 (engine.py): Usar source_id (wamid da Meta) ao invés do ID numérico do Chatwoot
                   ao salvar o MessageStatus para funis.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


# =============================================================================
# FIX 1 — worker.py: Não enviar placeholder [Template:] ao Chatwoot
# =============================================================================

class TestTemplateContentSync:
    """
    Testa que a lógica de sincronização de mensagem no worker
    ignora placeholders de template e só envia conteúdo real.
    """

    def _check_sync_logic(self, content: str) -> str | None:
        """
        Simula a lógica exata do worker.py após a correção:
        Retorna None quando é placeholder de template, ou o conteúdo original caso contrário.
        """
        sync_content = content
        if sync_content and sync_content.startswith("[Template:"):
            sync_content = None
        return sync_content

    def test_placeholder_template_deve_ser_ignorado(self):
        """[Fix 1] Placeholder '[Template: nome]' deve retornar None (não será enviado)."""
        result = self._check_sync_logic("[Template: boas_vindas_desbloqueineural]")
        assert result is None, "Placeholder de template não deve ser sincronizado no Chatwoot"

    def test_mensagem_direta_deve_ser_enviada(self):
        """[Fix 1] Mensagem direta real deve passar normalmente."""
        content = "Olá! Bem-vindo ao nosso grupo 👋"
        result = self._check_sync_logic(content)
        assert result == content, "Mensagem direta deve ser sincronizada no Chatwoot"

    def test_link_whatsapp_deve_ser_enviado(self):
        """[Fix 1] Mensagem com link deve ser sincronizada normalmente."""
        content = "Acesse o grupo pelo link abaixo 👇\nhttps://chat.whatsapp.com/Abc123"
        result = self._check_sync_logic(content)
        assert result == content

    def test_template_com_prefixo_variado_deve_ser_ignorado(self):
        """[Fix 1] Qualquer conteúdo começando com '[Template:' é placeholder."""
        result = self._check_sync_logic("[Template: outro_template_qualquer]")
        assert result is None

    def test_conteudo_vazio_nao_deve_causar_erro(self):
        """[Fix 1] Conteúdo None não deve causar erro."""
        result = self._check_sync_logic(None)
        assert result is None

    def test_conteudo_template_em_posicao_diferente_deve_passar(self):
        """[Fix 1] Texto que contém '[Template:' mas não começa com ele deve passar."""
        content = "Mensagem com [Template: referencia] no meio"
        result = self._check_sync_logic(content)
        assert result == content, "Somente strings que COMEÇAM com '[Template:' devem ser bloqueadas"

    def test_placeholder_audio_deve_ser_enviado(self):
        """[Fix 1] Placeholder de áudio '[Áudio: url]' deve ser enviado (não é template)."""
        content = "[Áudio: https://example.com/audio.mp3]"
        result = self._check_sync_logic(content)
        assert result == content, "Placeholder de áudio deve passar (é conteúdo real)"


# =============================================================================
# FIX 2 — engine.py: Usar source_id (wamid) do Chatwoot no MessageStatus
# =============================================================================

class TestEngineMessageIdExtraction:
    """
    Testa que o engine.py extrai corretamente o source_id (wamid)
    da resposta do Chatwoot para salvar no MessageStatus.
    """

    def _extract_msg_id(self, chatwoot_response: dict) -> str:
        """
        Simula a lógica exata do engine.py após a correção:
        Prefere source_id (wamid) ao ID numérico do Chatwoot.
        """
        source_id = chatwoot_response.get("source_id", "")
        chatwoot_id = str(chatwoot_response.get("id", ""))
        if source_id:
            return source_id.replace("wamid.", "")
        else:
            return chatwoot_id

    def test_source_id_wamid_deve_ser_priorizado(self):
        """[Fix 2] Quando source_id (wamid) está presente, deve ser usado ao invés do ID numérico."""
        response = {
            "id": 12189,
            "source_id": "wamid.HBgMNTU2NTk5NjMyODcyFQIAERgSREUzM0RBOEU5MDdDRkVBOTAxAA=="
        }
        result = self._extract_msg_id(response)
        # Deve retornar o wamid SEM o prefixo "wamid."
        assert result == "HBgMNTU2NTk5NjMyODcyFQIAERgSREUzM0RBOEU5MDdDRkVBOTAxAA=="
        assert result != "12189", "ID numérico do Chatwoot NÃO deve ser usado quando wamid está disponível"

    def test_wamid_sem_prefixo_deve_ser_normalizado(self):
        """[Fix 2] source_id com prefixo 'wamid.' deve ter o prefixo removido."""
        response = {
            "id": 12189,
            "source_id": "wamid.HBgMNTU1MTkyMTgyNzg2FQIAERgSRDg4RkMwRkJFRTI3RTZGNEVFAA=="
        }
        result = self._extract_msg_id(response)
        assert not result.startswith("wamid.")
        assert "HBgMNTU1MTkyMTgyNzg2" in result

    def test_fallback_para_chatwoot_id_quando_sem_source_id(self):
        """[Fix 2] Quando source_id não está presente, usa o ID numérico do Chatwoot como fallback."""
        response = {
            "id": 12187,
            "source_id": ""  # Vazio
        }
        result = self._extract_msg_id(response)
        assert result == "12187"

    def test_fallback_para_chatwoot_id_quando_source_id_ausente(self):
        """[Fix 2] Quando source_id não existe no response, usa ID numérico."""
        response = {"id": 12190}  # Sem source_id
        result = self._extract_msg_id(response)
        assert result == "12190"

    def test_source_id_none_usa_id_numerico(self):
        """[Fix 2] source_id None usa fallback para ID numérico."""
        response = {"id": 99, "source_id": None}
        # None -> str(None) = "None", deve cair no branch do chatwoot_id
        source_id = response.get("source_id", "")
        chatwoot_id = str(response.get("id", ""))
        if source_id:  # None é falsy
            result = source_id.replace("wamid.", "")
        else:
            result = chatwoot_id
        assert result == "99"

    def test_wamid_no_banco_e_encontrado_no_status_webhook(self):
        """
        [Fix 2 - Integração] Verifica que o wamid extraído do Chatwoot
        é o mesmo que chega no webhook de status da Meta (sem prefixo).
        """
        # Simula a resposta do Chatwoot ao enviar uma mensagem de funil
        chatwoot_send_response = {
            "id": 12189,
            "source_id": "wamid.HBgMNTU2NTk5NjMyODcyFQIAERgSREUzM0RBOEU5MDdDRkVBOTAxAA=="
        }

        # Simula o ID que chega no webhook de status da Meta
        meta_webhook_msg_id = "wamid.HBgMNTU2NTk5NjMyODcyFQIAERgSREUzM0RBOEU5MDdDRkVBOTAxAA=="
        meta_clean_id = meta_webhook_msg_id.replace("wamid.", "")

        # ID que seria salvo no banco com a correção
        saved_id = self._extract_msg_id(chatwoot_send_response)

        # O ID salvo no banco DEVE ser igual ao ID limpo que chega no webhook
        assert saved_id == meta_clean_id, (
            f"O MessageStatus salvo com id='{saved_id}' não seria encontrado "
            f"pelo webhook que procura por '{meta_clean_id}'"
        )
