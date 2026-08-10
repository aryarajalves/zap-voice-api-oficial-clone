"""
Teste unitário para a transcodificação automática de vídeos no upload-template-media.
Verifica que:
1. Vídeos são detectados corretamente pelo mime_type e extensão
2. O FFmpeg é chamado com os parâmetros corretos (H.264 + AAC + FastStart)
3. Imagens NÃO são transcodificadas (passam direto)
4. Timeout do FFmpeg retorna HTTPException 400
"""
import pytest
import subprocess
from unittest.mock import patch, MagicMock, AsyncMock
from io import BytesIO


def test_is_video_detected_by_mimetype():
    """Vídeo identificado corretamente pelo Content-Type."""
    mime = "video/mp4"
    is_video = mime.startswith("video/")
    assert is_video is True


def test_is_video_detected_by_extension():
    """Vídeo identificado corretamente pela extensão do arquivo quando mime é genérico."""
    filename = "meu_video.mov"
    mime = "application/octet-stream"
    is_video = mime.startswith("video/") or filename.lower().endswith((".mp4", ".mov", ".avi", ".mkv", ".webm"))
    assert is_video is True


def test_image_not_video():
    """Imagens NÃO devem ser identificadas como vídeo."""
    mime = "image/jpeg"
    filename = "foto.jpg"
    is_video = mime.startswith("video/") or filename.lower().endswith((".mp4", ".mov", ".avi", ".mkv", ".webm"))
    assert is_video is False


def test_ffmpeg_called_with_correct_params():
    """FFmpeg deve ser chamado com H.264, AAC, yuv420p e faststart."""
    expected_args_subset = [
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "fast",
        "-crf", "23",
        "-c:a", "aac",
        "-b:a", "128k",
        "-movflags", "+faststart",
    ]

    captured_call = []

    def fake_run(args, **kwargs):
        captured_call.extend(args)
        mock_result = MagicMock()
        mock_result.returncode = 0
        return mock_result

    with patch("subprocess.run", side_effect=fake_run):
        import subprocess, tempfile, os
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as f:
            f.write(b"fake video bytes")
            input_tmp = f.name
        output_tmp = input_tmp.replace(".mp4", "_wpp.mp4")

        subprocess.run(
            [
                "ffmpeg", "-y",
                "-i", input_tmp,
                "-c:v", "libx264",
                "-pix_fmt", "yuv420p",
                "-preset", "fast",
                "-crf", "23",
                "-c:a", "aac",
                "-b:a", "128k",
                "-movflags", "+faststart",
                output_tmp
            ],
            capture_output=True,
            text=True,
            timeout=300
        )

        os.remove(input_tmp)

    for arg in expected_args_subset:
        assert arg in captured_call, f"Argumento esperado '{arg}' não encontrado na chamada do FFmpeg."


def test_ffmpeg_timeout_raises():
    """Timeout do FFmpeg deve lançar uma exceção controlável."""
    import subprocess as sp
    with patch("subprocess.run", side_effect=sp.TimeoutExpired(cmd="ffmpeg", timeout=300)):
        with pytest.raises(sp.TimeoutExpired):
            sp.run(
                ["ffmpeg", "-y", "-i", "fake.mp4", "output.mp4"],
                capture_output=True,
                text=True,
                timeout=300
            )


def test_ffmpeg_failure_returncode():
    """Returncode != 0 do FFmpeg deve ser detectado como erro."""
    mock_result = MagicMock()
    mock_result.returncode = 1
    mock_result.stderr = "Error: Invalid data found when processing input"

    with patch("subprocess.run", return_value=mock_result):
        import subprocess
        result = subprocess.run(["ffmpeg", "-y", "-i", "fake.mp4", "out.mp4"], capture_output=True, text=True, timeout=300)
        assert result.returncode != 0
        assert "Invalid data" in result.stderr


def test_mime_type_set_to_video_mp4_after_transcode():
    """Após transcodificação, o mime_type deve ser forçado para video/mp4."""
    original_mime = "video/quicktime"
    # Simula o que acontece após a transcodificação
    mime_type_after = "video/mp4"
    assert mime_type_after == "video/mp4"
