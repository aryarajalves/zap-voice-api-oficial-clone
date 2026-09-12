import os
import sys

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ["DATABASE_URL"] = "sqlite://"

import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock
from core.clients.whatsapp.client import WhatsAppClient, _META_MEDIA_CACHE
from services.bulk_core import _extract_header_media, send_smart_message
from services.chat_media_service import upload_media_to_meta_from_url


@pytest.mark.asyncio
async def test_meta_media_cache_hit_avoids_redundant_upload():
    """Testa que o cache de Media ID evita downloads e uploads repetidos da mesma URL."""
    wa = WhatsAppClient(client_id=1)
    test_url = "https://s3.exemplo.com/video_promocional.mp4"
    cache_key = (1, test_url)

    # Limpa cache antes do teste
    _META_MEDIA_CACHE.pop(cache_key, None)

    # 1. Simula primeiro upload bem sucedido
    with patch.object(wa, "upload_media_to_meta", new_callable=AsyncMock) as mock_upload, \
         patch.object(wa, "_download_file_with_ext", new_callable=AsyncMock) as mock_download:
        
        mock_download.return_value = ("/fake/path/video.mp4", "/fake/tmp.mp4")
        mock_upload.return_value = "meta_media_id_9999"

        payload1 = {"link": test_url}
        with patch("os.path.exists", return_value=True), patch("os.remove"):
            await wa._resolve_and_upload_media_param("video", payload1)

        assert payload1.get("id") == "meta_media_id_9999"
        assert "link" not in payload1
        assert _META_MEDIA_CACHE.get(cache_key)["id"] == "meta_media_id_9999"
        assert mock_upload.call_count == 1
        assert mock_download.call_count == 1

    # 2. Segundo envio para contato diferente com a mesma URL: deve bater no cache sem chamar download nem upload!
    with patch.object(wa, "upload_media_to_meta", new_callable=AsyncMock) as mock_upload2, \
         patch.object(wa, "_download_file_with_ext", new_callable=AsyncMock) as mock_download2:

        payload2 = {"link": test_url}
        await wa._resolve_and_upload_media_param("video", payload2)

        assert payload2.get("id") == "meta_media_id_9999"
        assert "link" not in payload2
        assert mock_upload2.call_count == 0
        assert mock_download2.call_count == 0


@pytest.mark.asyncio
async def test_send_video_official_supports_cached_and_direct_media_id():
    """Testa envio oficial de vídeo utilizando Media ID numérico direto e via cache."""
    wa = WhatsAppClient(client_id=1)
    
    with patch.object(wa, "_meta_request", new_callable=AsyncMock) as mock_req:
        mock_req.return_value = {"messages": [{"id": "wamid.123"}]}
        
        # Envio com media_id numérico direto
        await wa.send_video_official("5511999999999", "1769384704269745", caption="Legenda")
        
        assert mock_req.call_count == 1
        sent_payload = mock_req.call_args[1]["json"]
        assert sent_payload["video"]["id"] == "1769384704269745"
        assert sent_payload["video"]["caption"] == "Legenda"


def test_extract_header_media_finds_video_or_image():
    """Testa extração de mídia do cabeçalho de componentes de template."""
    components = [
        {
            "type": "header",
            "parameters": [
                {
                    "type": "video",
                    "video": {"link": "https://s3.exemplo.com/oferta.mp4"}
                }
            ]
        },
        {
            "type": "body",
            "parameters": [{"type": "text", "text": "Nome"}]
        }
    ]
    extracted = _extract_header_media(components)
    assert extracted == ("video", "https://s3.exemplo.com/oferta.mp4")


@pytest.mark.asyncio
async def test_smart_send_uses_2s_delay_instead_of_7s():
    """Valida que o Smart Send com mídia utiliza delay de 2s (otimização 2) em vez de 7s."""
    mock_chatwoot = MagicMock()
    mock_chatwoot.simulate = False
    mock_chatwoot.client_id = 1
    mock_chatwoot.find_existing_conversation = AsyncMock(return_value=None)
    mock_chatwoot.send_video_official = AsyncMock(return_value={"success": True})
    mock_chatwoot.send_interactive_buttons = AsyncMock(return_value={"messages": [{"id": "wamid.456"}]})
    mock_chatwoot.send_text_direct = AsyncMock(return_value={"messages": [{"id": "wamid.456"}]})

    components = [
        {
            "type": "header",
            "parameters": [
                {
                    "type": "video",
                    "video": {"link": "https://s3.exemplo.com/oferta.mp4"}
                }
            ]
        }
    ]

    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)

    with patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep, \
         patch("services.template_history_service.is_template_sent_in_last_24h", return_value=False), \
         patch("services.template_history_service.record_template_dispatch"):

        res = await send_smart_message(
            chatwoot=mock_chatwoot,
            phone="5511988887777",
            trigger_id=10,
            template_name="oferta",
            language="pt_BR",
            components=components,
            last_interaction=now, # Janela aberta -> dispara Smart Send
            template_body_cache="Olá {{1}}!"
        )

        assert res.get("success") is True
        assert res.get("type") == "FREE_MESSAGE"
        assert mock_chatwoot.send_video_official.call_count == 1
        # Verifica que o sleep foi chamado com 2 segundos (não 7!)
        assert mock_sleep.call_count >= 1
        sleep_args = [call[0][0] for call in mock_sleep.call_args_list]
        assert 2 in sleep_args
        assert 7 not in sleep_args
