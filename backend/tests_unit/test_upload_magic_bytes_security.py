import pytest
import io
from core.file_validator import validate_file_magic_bytes
from models import User, Client
from core.security import get_password_hash, create_access_token

def test_validate_magic_bytes_blocks_disguised_executables():
    """
    Testa se o validador rejeita executáveis renomeados com extensões de imagem ou documento.
    """
    # 1. Windows DOS/PE executável simulado (construído dinamicamente para evitar falsos positivos de AV)
    fake_png_exe = bytes([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00])
    is_valid, msg = validate_file_magic_bytes(fake_png_exe, "relatorio_seguro.png")
    assert is_valid is False
    assert "Executável Windows" in msg

    # 2. Linux ELF binário disfarçado de PDF
    fake_pdf_elf = bytes([0x7F, 0x45, 0x4C, 0x46, 0x02, 0x01, 0x01])
    is_valid, msg = validate_file_magic_bytes(fake_pdf_elf, "documento.pdf")
    assert is_valid is False
    assert "Executável Linux" in msg

    # 3. Script PHP disfarçado de JPG
    fake_jpg_php = bytes([0x3C, 0x3F, 0x70, 0x68, 0x70, 0x20]) + b"echo 'test';"
    is_valid, msg = validate_file_magic_bytes(fake_jpg_php, "foto.jpg")
    assert is_valid is False
    assert "Script PHP" in msg

    # 4. Arquivo com extensão PNG mas dados aleatórios de texto
    fake_png_text = b"Ola, este e apenas um texto puro fingindo ser PNG"
    is_valid, msg = validate_file_magic_bytes(fake_png_text, "foto.png")
    assert is_valid is False
    assert "não corresponde a uma imagem PNG válida" in msg


def test_validate_magic_bytes_accepts_valid_formats():
    """
    Testa se o validador aceita arquivos legítimos com as assinaturas corretas.
    """
    # PNG real
    real_png = bytes([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]) + b"\x00\x00\x00\rIHDR"
    assert validate_file_magic_bytes(real_png, "imagem.png")[0] is True

    # JPEG real
    real_jpg = bytes([0xFF, 0xD8, 0xFF, 0xE0]) + b"\x00\x10JFIF"
    assert validate_file_magic_bytes(real_jpg, "foto.jpg")[0] is True
    assert validate_file_magic_bytes(real_jpg, "foto.jpeg")[0] is True

    # PDF real
    real_pdf = b"%PDF-1.7\n" + bytes([0x25, 0xE2, 0xE3, 0xCF, 0xD3])
    assert validate_file_magic_bytes(real_pdf, "contrato.pdf")[0] is True

    # OGG real
    real_ogg = b"OggS\x00\x02\x00\x00\x00\x00"
    assert validate_file_magic_bytes(real_ogg, "audio.ogg")[0] is True

    # WebP real
    real_webp = b"RIFF\x24\x00\x00\x00WEBPVP8 "
    assert validate_file_magic_bytes(real_webp, "sticker.webp")[0] is True


def test_api_upload_endpoint_magic_bytes_rejection(client, db_session):
    """
    Testa se o endpoint /api/upload rejeita requisições HTTP com arquivos disfarçados.
    """
    test_client = Client(name="Empresa Upload Security", is_active=True)
    db_session.add(test_client)
    db_session.commit()
    db_session.refresh(test_client)

    user = User(
        email="upload_user@zapvoice.com",
        hashed_password=get_password_hash("pass123"),
        role="user",
        is_active=True,
        client_id=test_client.id
    )
    user.accessible_clients.append(test_client)
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    token = create_access_token(data={"sub": user.email})
    headers = {"Authorization": f"Bearer {token}", "X-Client-ID": str(test_client.id)}

    # Envia payload com extensão .png mas conteúdo de executável simulado
    fake_exe_bytes = io.BytesIO(bytes([0x4D, 0x5A, 0x90, 0x00]) + b"simulated_invalid_binary")
    files = {"file": ("malware_disfarcado.png", fake_exe_bytes, "image/png")}

    response = client.post("/api/upload", files=files, headers=headers)
    assert response.status_code == 400
    assert "Executável Windows" in response.text
