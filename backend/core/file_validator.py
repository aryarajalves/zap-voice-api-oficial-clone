import os
from typing import Tuple
from core.logger import setup_logger

logger = setup_logger("file_validator")

# Assinaturas de arquivos executáveis / perigosos que NUNCA devem ser aceitos
BLOCKED_MAGIC_SIGNATURES = [
    (b"MZ", "Executável Windows (DOS/PE)"),
    (b"\x7fELF", "Executável Linux (ELF)"),
    (b"\xca\xfe\xba\xbe", "Bytecode Java/Mach-O"),
    (b"#!", "Script de Shell / Shebang"),
    (b"<?php", "Script PHP"),
    (b"<% ", "Script ASP/JSP"),
]

def validate_file_magic_bytes(file_header: bytes, filename: str) -> Tuple[bool, str]:
    """
    Valida os magic bytes iniciais de um arquivo enviado contra sua extensão declarada.
    Retorna (is_valid, error_message).
    """
    if not file_header:
        return False, "Arquivo vazio."

    # 1. Bloqueio imediato de executáveis perigosos
    for sig, desc in BLOCKED_MAGIC_SIGNATURES:
        if file_header.startswith(sig):
            logger.warning(f"🚨 [FILE_SECURITY] Arquivo {filename} rejeitado por conter assinatura perigosa: {desc}")
            return False, f"Arquivo rejeitado por motivos de segurança ({desc})."

    ext = os.path.splitext(filename)[1].lower()

    # 2. Validação por formato
    # Imagens
    if ext in ('.jpg', '.jpeg'):
        if not file_header.startswith(b"\xff\xd8\xff"):
            return False, "O conteúdo do arquivo não corresponde a uma imagem JPEG válida."
    elif ext == '.png':
        if not file_header.startswith(b"\x89PNG\r\n\x1a\n"):
            return False, "O conteúdo do arquivo não corresponde a uma imagem PNG válida."
    elif ext == '.gif':
        if not (file_header.startswith(b"GIF87a") or file_header.startswith(b"GIF89a")):
            return False, "O conteúdo do arquivo não corresponde a uma imagem GIF válida."
    elif ext == '.webp':
        if not (file_header.startswith(b"RIFF") and len(file_header) >= 12 and file_header[8:12] == b"WEBP"):
            return False, "O conteúdo do arquivo não corresponde a uma imagem WebP válida."

    # Documentos
    elif ext == '.pdf':
        if not file_header.startswith(b"%PDF-"):
            return False, "O conteúdo do arquivo não corresponde a um documento PDF válido."
    elif ext in ('.zip', '.docx', '.xlsx', '.pptx'):
        if not (file_header.startswith(b"PK\x03\x04") or file_header.startswith(b"PK\x05\x06") or file_header.startswith(b"PK\x07\x08")):
            return False, f"O conteúdo do arquivo não corresponde ao formato compactado/Office ({ext}) válido."
    elif ext == '.rar':
        if not (file_header.startswith(b"Rar!\x1a\x07\x00") or file_header.startswith(b"Rar!\x1a\x07\x01\x00")):
            return False, "O conteúdo do arquivo não corresponde a um arquivo RAR válido."
    elif ext == '.txt':
        # Texto puro não deve conter bytes nulos nos primeiros bytes
        if b"\x00" in file_header[:512]:
            return False, "O conteúdo do arquivo de texto contém caracteres binários inválidos."

    # Áudios
    elif ext == '.ogg':
        if not file_header.startswith(b"OggS"):
            return False, "O conteúdo do arquivo não corresponde a um áudio OGG válido."
    elif ext == '.wav':
        if not (file_header.startswith(b"RIFF") and len(file_header) >= 12 and file_header[8:12] == b"WAVE"):
            return False, "O conteúdo do arquivo não corresponde a um áudio WAV válido."
    elif ext == '.mp3':
        is_id3 = file_header.startswith(b"ID3")
        is_sync = len(file_header) >= 2 and file_header[0] == 0xFF and (file_header[1] & 0xE0) == 0xE0
        if not (is_id3 or is_sync):
            return False, "O conteúdo do arquivo não corresponde a um áudio MP3 válido."

    # Vídeos
    elif ext in ('.mp4', '.m4a', '.mov', '.3gp'):
        # MP4/MOV/M4A/3GP geralmente possui 'ftyp' ou 'moov' nos primeiros 16 bytes
        has_ftyp = len(file_header) >= 8 and file_header[4:8] == b"ftyp"
        has_moov = b"moov" in file_header[:32]
        if not (has_ftyp or has_moov):
            return False, f"O conteúdo do arquivo não corresponde a um vídeo/áudio ({ext}) válido."
    elif ext in ('.webm', '.mkv'):
        if not file_header.startswith(b"\x1a\x45\xdf\xa3"):
            return False, f"O conteúdo do arquivo não corresponde a um contêiner Matroska/WebM ({ext}) válido."

    return True, ""
