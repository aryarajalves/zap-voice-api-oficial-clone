import pytest
import os
from unittest.mock import patch, MagicMock
from core.clients.whatsapp.client import WhatsAppClient

@pytest.mark.asyncio
async def test_send_audio_official_transcodes_non_ogg():
    """Valida se send_audio_official transcodifica arquivos não .ogg com FFmpeg para OGG Opus."""
    client = WhatsAppClient(client_id=1)
    
    with patch.object(client, "_download_file", return_value=("fake_audio.webm", None)), \
         patch("os.path.exists", return_value=True), \
         patch("subprocess.run") as mock_subprocess, \
         patch.object(client, "upload_media_to_meta", return_value="meta_audio_id_123") as mock_upload, \
         patch.object(client, "send_official_audio", return_value={"messages": [{"id": "wa_msg_audio_1"}]}) as mock_send:
        
        mock_subprocess.return_value.returncode = 0
        
        result = await client.send_audio_official("5511999999999", "https://example.com/fake_audio.webm")
        
        # FFmpeg deve ter sido chamado para converter para .ogg com codec libopus
        assert mock_subprocess.called
        cmd_called = mock_subprocess.call_args[0][0]
        assert "ffmpeg" in cmd_called
        assert "libopus" in cmd_called
        assert "48000" in cmd_called
        
        # Upload para Meta deve ser feito como audio/ogg
        mock_upload.assert_called_once()
        assert mock_upload.call_args[0][1] == "audio/ogg"
        
        # Envio oficial deve ter sido chamado
        mock_send.assert_called_once_with("5511999999999", "meta_audio_id_123")
        assert result.get("messages")[0]["id"] == "wa_msg_audio_1"
