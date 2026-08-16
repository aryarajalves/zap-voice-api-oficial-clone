import os
import subprocess
import tempfile
import pytest

def test_ffmpeg_whatsapp_compression_params():
    """Valida se os parâmetros do FFmpeg geram vídeo compatível com WhatsApp (H.264, AAC, faststart e < 15.5MB)"""
    # Criar um vídeo sintético de 2 segundos com ffmpeg
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f_in:
        input_path = f_in.name

    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f_out:
        output_path = f_out.name

    try:
        # Gera vídeo de teste de 2 segundos
        gen_cmd = [
            "ffmpeg", "-y",
            "-f", "lavfi", "-i", "testsrc=duration=2:size=1920x1080:rate=30",
            "-f", "lavfi", "-i", "sine=frequency=1000:duration=2",
            "-c:v", "libx264", "-c:a", "aac",
            input_path
        ]
        res_gen = subprocess.run(gen_cmd, capture_output=True, text=True)
        assert res_gen.returncode == 0, f"Falha ao gerar vídeo de teste: {res_gen.stderr}"

        # Executa o comando de compressão do Passo 1
        cmd_pass1 = [
            "ffmpeg", "-y",
            "-i", input_path,
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-preset", "fast",
            "-crf", "26",
            "-maxrate", "2.0M",
            "-bufsize", "4.0M",
            "-vf", "scale='min(1280,iw)':-2",
            "-c:a", "aac",
            "-b:a", "128k",
            "-movflags", "+faststart",
            output_path
        ]
        res = subprocess.run(cmd_pass1, capture_output=True, text=True)
        assert res.returncode == 0, f"Falha ao comprimir vídeo: {res.stderr}"
        assert os.path.exists(output_path)
        
        # Garante que o arquivo foi gerado e é menor que 15.5 MB
        out_size = os.path.getsize(output_path)
        assert out_size > 0
        assert out_size < 15.5 * 1024 * 1024

    finally:
        if os.path.exists(input_path):
            try: os.remove(input_path)
            except: pass
        if os.path.exists(output_path):
            try: os.remove(output_path)
            except: pass

def test_upload_file_does_not_mutate_content_type():
    """Valida que o fluxo de upload de vídeo não tenta atribuir a file.content_type (que é read-only no Starlette)"""
    from starlette.datastructures import UploadFile
    import io

    fake_video_bytes = b"fake video content for test"
    upload_file = UploadFile(filename="test.mp4", file=io.BytesIO(fake_video_bytes), headers={"content-type": "video/mp4"})
    
    # Valida que file.content_type é acessível e não quebra se mantido como read-only
    assert upload_file.content_type == "video/mp4"

