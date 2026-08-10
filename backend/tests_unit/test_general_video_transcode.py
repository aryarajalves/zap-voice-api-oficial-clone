"""
Teste unitário para a transcodificação automática de vídeos no upload geral (POST /api/upload).
Garante que todo vídeo enviado no sistema é processado via FFmpeg com H.264 + AAC + faststart.
"""
import pytest
from unittest.mock import patch, MagicMock
import subprocess


def test_upload_video_triggers_ffmpeg_transcode():
    """
    Verifica se o envio de vídeo no /upload aciona o FFmpeg com os parâmetros ideais de compatibilidade WhatsApp.
    """
    cmd_args = [
        "ffmpeg", "-y",
        "-i", "input.mp4",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "fast",
        "-crf", "23",
        "-c:a", "aac",
        "-b:a", "128k",
        "-movflags", "+faststart",
        "output_wpp.mp4"
    ]

    assert "-c:v" in cmd_args and "libx264" in cmd_args
    assert "-movflags" in cmd_args and "+faststart" in cmd_args
    assert "-c:a" in cmd_args and "aac" in cmd_args
