import io
import re
import html
import math
from uuid import uuid4
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    HRFlowable,
    Table,
    TableStyle
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas
from core.logger import logger


def format_lead_name_title(lead_name: str) -> str:
    """
    Formata o nome do lead em Title Case elegante (ex: 'ARYARAJ ALVES' -> 'Aryaraj Alves'),
    preservando preposições em minúsculo.
    """
    if not lead_name or not lead_name.strip():
        return "Consulente"
    lower_particles = {"da", "de", "do", "das", "dos", "e"}
    words = lead_name.strip().split()
    formatted = []
    for idx, w in enumerate(words):
        w_low = w.lower()
        if idx > 0 and w_low in lower_particles:
            formatted.append(w_low)
        else:
            formatted.append(w_low.capitalize())
    return " ".join(formatted)


def format_bussola_display_filename(
    lead_name: str,
    filename_prefix: str = "Leitura da Bússola"
) -> tuple[str, str]:
    """
    Retorna:
      1) display_filename: Nome bonito exibido no balão do WhatsApp (com acentos, espaços e emoji)
      2) safe_storage_name: Nome ASCII limpo para armazenamento no S3/MinIO
    """
    pretty_full = format_lead_name_title(lead_name)
    first_name_pretty = pretty_full.split()[0] if pretty_full else "Consulente"

    ascii_first = re.sub(r'[^a-zA-Z0-9]', '', first_name_pretty) or "Consulente"

    if filename_prefix in ("Leitura_Bussola", "Leitura da Bússola", ""):
        display_filename = f"✨ Leitura da Bússola - {first_name_pretty}.pdf"
    else:
        clean_prefix = filename_prefix.replace("_", " ").strip()
        display_filename = f"✨ {clean_prefix} - {first_name_pretty}.pdf"

    safe_storage_name = f"Leitura_Bussola_{ascii_first}.pdf"
    return display_filename, safe_storage_name


class NumberedCanvas(canvas.Canvas):
    """
    Canvas de dois passos para desenhar o cabeçalho editorial na 1ª página,
    moldura sutil e rodapé numerado em todas as páginas.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        page_w, page_h = A4

        # Moldura externa sutil em todas as páginas
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.6)
        self.rect(24, 20, page_w - 48, page_h - 40)

        # Na página 1, desenha o banner superior Editorial Navy + Dourado
        if self._pageNumber == 1:
            banner_h = 74
            banner_y = page_h - 20 - banner_h
            self.setFillColor(colors.HexColor("#0f172a"))
            self.rect(24, banner_y, page_w - 48, banner_h, stroke=0, fill=1)

            # Filete dourado na base do banner
            self.setFillColor(colors.HexColor("#d4af37"))
            self.rect(24, banner_y, page_w - 48, 3, stroke=0, fill=1)

            # Ornamento de Bússola à direita do banner
            cx = page_w - 68
            cy = banner_y + (banner_h / 2) + 2
            self.setStrokeColor(colors.HexColor("#d4af37"))
            self.setLineWidth(0.8)
            self.circle(cx, cy, 18, stroke=1, fill=0)
            self.setLineWidth(0.4)
            self.circle(cx, cy, 12, stroke=1, fill=0)
            self.line(cx - 22, cy, cx + 22, cy)
            self.line(cx, cy - 22, cx, cy + 22)

            # Subtítulo dourado no banner
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(colors.HexColor("#d4af37"))
            self.drawString(44, banner_y + 48, "BUSSOLA ASTROLOGICA  •  MAPA E ORIENTACAO PESSOAL")

            # Título principal branco no banner
            self.setFont("Helvetica-Bold", 18)
            self.setFillColor(colors.HexColor("#ffffff"))
            self.drawString(44, banner_y + 22, "Leitura Personalizada da Bússola")
        else:
            # Cabeçalho compacto nas páginas seguintes
            self.setStrokeColor(colors.HexColor("#d4af37"))
            self.setLineWidth(1.0)
            self.line(42, page_h - 42, page_w - 42, page_h - 42)
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(colors.HexColor("#64748b"))
            self.drawString(42, page_h - 36, "Bússola Astrológica • Continuação da Leitura")

        # Rodapé elegante
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.6)
        self.line(42, 42, page_w - 42, 42)

        self.setStrokeColor(colors.HexColor("#d4af37"))
        self.setLineWidth(1.5)
        self.line(42, 42, 95, 42)

        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        self.drawString(42, 29, "Bússola Astrológica • Leitura Confidencial e Pessoal")

        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#0f172a"))
        footer_text = f"Página {self._pageNumber} de {page_count}"
        self.drawRightString(page_w - 42, 29, footer_text)

        self.restoreState()


def sanitize_text_for_pdf(text: str) -> str:
    """
    Remove ou substitui caracteres que não pertencem ao encoding padrão Helvetica (Latin-1),
    evitando que emojis (🔮, ✨, etc.) causem UnicodeEncodeError no ReportLab.
    """
    if not text:
        return ""

    replacements = {
        "\u2013": "-",
        "\u2014": " - ",
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2022": "•",
        "\u2026": "...",
    }
    for k, v in replacements.items():
        text = text.replace(k, v)

    sanitized = []
    for char in text:
        code = ord(char)
        if code in (9, 10, 13) or (32 <= code <= 126) or (160 <= code <= 255):
            sanitized.append(char)
        else:
            continue
    return "".join(sanitized)


def format_whatsapp_text_to_reportlab_html(raw_text: str) -> str:
    """
    Converte marcação de texto estilo WhatsApp (*negrito*, _itálico_) e quebras de linha
    para marcações XML aceitas pelo componente Paragraph do ReportLab.
    """
    if not raw_text:
        return ""

    safe_text = sanitize_text_for_pdf(raw_text)
    safe_text = html.escape(safe_text)
    safe_text = re.sub(r'\*([^*]+)\*', r'<b>\1</b>', safe_text)
    safe_text = re.sub(r'_([^_]+)_', r'<i>\1</i>', safe_text)
    safe_text = safe_text.replace('\r\n', '\n').replace('\r', '\n')
    safe_text = safe_text.replace('\n', '<br/>')

    return safe_text


def generate_bussola_pdf_bytes(
    lead_name: str,
    birth_date: str,
    message_text: str
) -> bytes:
    """
    Gera o PDF com layout Editorial Premium em memória e retorna os bytes do documento.
    """
    buffer = io.BytesIO()

    margin = 42
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=margin,
        rightMargin=margin,
        topMargin=108,  # Reserva espaço para o banner editorial da 1ª página
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    meta_label_style = ParagraphStyle(
        name="BussolaMetaLabel",
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#b45309")  # Amber 700 / Dourado escuro
    )

    meta_value_style = ParagraphStyle(
        name="BussolaMetaValue",
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#0f172a")
    )

    section_heading_style = ParagraphStyle(
        name="BussolaSectionHeading",
        fontName="Helvetica-Bold",
        fontSize=11.5,
        leading=16,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=10,
        spaceAfter=4
    )

    body_style = ParagraphStyle(
        name="BussolaBody",
        fontName="Helvetica",
        fontSize=10.5,
        leading=16,
        textColor=colors.HexColor("#1e293b"),
        spaceBefore=4,
        spaceAfter=8
    )

    story = []

    # 1. Card de Identificação do Consulente (Estilo Editorial com borda lateral dourada)
    pretty_name = format_lead_name_title(lead_name)
    name_display = sanitize_text_for_pdf(pretty_name).strip() or "Consulente"
    birth_display = sanitize_text_for_pdf(birth_date or "Não informada").strip()

    meta_data = [
        [
            Paragraph("CONSULENTE", meta_label_style),
            Paragraph("DATA E HORÁRIO DE NASCIMENTO", meta_label_style)
        ],
        [
            Paragraph(html.escape(name_display), meta_value_style),
            Paragraph(html.escape(birth_display), meta_value_style)
        ]
    ]

    col_width = doc.width / 2
    meta_table = Table(meta_data, colWidths=[col_width, col_width])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('BOX', (0, 0), (-1, -1), 0.6, colors.HexColor("#e2e8f0")),
        ('LINEBEFORE', (0, 0), (0, -1), 3.5, colors.HexColor("#d4af37")),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 2),
        ('TOPPADDING', (0, 1), (-1, 1), 1),
        ('BOTTOMPADDING', (0, 1), (-1, 1), 9),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 14))

    # 2. Corpo da Mensagem dividido em blocos editoriais
    normalized_raw = (message_text or "").replace('\r\n', '\n').replace('\r', '\n').strip()
    if not normalized_raw:
        story.append(Paragraph("<i>Nenhum conteúdo de leitura fornecido.</i>", body_style))
    else:
        blocks = [b.strip() for b in re.split(r'\n{2,}', normalized_raw) if b.strip()]
        for block in blocks:
            formatted_block = format_whatsapp_text_to_reportlab_html(block)
            if not formatted_block:
                continue
            # Se o bloco curto começa com negrito (título de seção), destaca visualmente
            if formatted_block.startswith("<b>") and len(block) < 120 and "<br/>" not in formatted_block:
                story.append(Paragraph(formatted_block, section_heading_style))
                story.append(HRFlowable(
                    width="18%",
                    thickness=1.2,
                    color=colors.HexColor("#d4af37"),
                    hAlign="LEFT",
                    spaceBefore=0,
                    spaceAfter=6
                ))
            else:
                story.append(Paragraph(formatted_block, body_style))

    doc.build(story, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer.getvalue()


def generate_bussola_cover_image_bytes(
    lead_name: str,
    birth_date: str,
    message_text: str = ""
) -> bytes:
    """
    Gera um Card / Capa Visual (PNG 1200x630) personalizada para o lead,
    ideal para cabeçalho de IMAGEM no WhatsApp ou prévia visual no Funil.
    """
    from PIL import Image, ImageDraw, ImageFont

    width, height = 1200, 630
    img = Image.new("RGB", (width, height), "#0b1120")
    draw = ImageDraw.Draw(img)

    # Gradiente sutil de fundo + círculos astrais
    for y in range(height):
        r = int(11 + (y / height) * 14)
        g = int(17 + (y / height) * 16)
        b = int(32 + (y / height) * 38)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    # Rosa dos ventos / anéis astrais decorativos à direita
    cx, cy = 980, 315
    for radius in (220, 175, 130, 85):
        draw.ellipse(
            [cx - radius, cy - radius, cx + radius, cy + radius],
            outline="#2a3655",
            width=2
        )
    draw.ellipse([cx - 175, cy - 175, cx + 175, cy + 175], outline="#d4af37", width=2)
    for angle_deg in range(0, 360, 30):
        rad = math.radians(angle_deg)
        x1 = cx + int(math.cos(rad) * 45)
        y1 = cy + int(math.sin(rad) * 45)
        x2 = cx + int(math.cos(rad) * 220)
        y2 = cy + int(math.sin(rad) * 220)
        draw.line([(x1, y1), (x2, y2)], fill="#23304c", width=1)

    # Moldura dupla dourada
    draw.rectangle([28, 28, width - 28, height - 28], outline="#d4af37", width=3)
    draw.rectangle([40, 40, width - 40, height - 40], outline="#1e293b", width=1)

    # Barra lateral dourada de destaque
    draw.rectangle([76, 95, 84, 535], fill="#d4af37")

    # Carrega fontes disponíveis ou fallback padrão
    def load_font(size: int, bold: bool = False):
        candidates = (
            [
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                "C:/Windows/Fonts/arialbd.ttf",
                "C:/Windows/Fonts/segoeuib.ttf",
            ]
            if bold
            else [
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                "C:/Windows/Fonts/arial.ttf",
                "C:/Windows/Fonts/segoeui.ttf",
            ]
        )
        for path in candidates:
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
        return ImageFont.load_default()

    font_tag = load_font(20, bold=True)
    font_title = load_font(46, bold=True)
    font_sub = load_font(26, bold=False)
    font_excerpt = load_font(21, bold=False)
    font_badge = load_font(20, bold=True)

    pretty_name = format_lead_name_title(lead_name)
    clean_birth = sanitize_text_for_pdf(birth_date or "Mapa Natal Personalizado").strip()

    # Tag superior dourada
    draw.text((112, 96), "BUSSOLA ASTROLOGICA  •  LEITURA OFICIAL", fill="#d4af37", font=font_tag)

    # Título com o nome do Consulente
    title_line_1 = "Leitura Astrológica de"
    title_line_2 = pretty_name[:28]
    draw.text((112, 145), title_line_1, fill="#f8fafc", font=font_title)
    draw.text((112, 205), title_line_2, fill="#fbbf24", font=font_title)

    # Data de nascimento
    draw.text((112, 282), f"Nascimento: {clean_birth}", fill="#94a3b8", font=font_sub)

    # Resumo/trecho da leitura
    clean_msg = sanitize_text_for_pdf(re.sub(r'[*_]', '', message_text or "")).strip()
    clean_msg = re.sub(r'\s+', ' ', clean_msg)
    if not clean_msg:
        clean_msg = "Sua leitura personalizada da Bússola Astrológica foi concluída e está pronta para consulta."

    words = clean_msg.split()
    lines = []
    cur_line = ""
    for w in words:
        test = f"{cur_line} {w}".strip()
        if len(test) <= 56:
            cur_line = test
        else:
            lines.append(cur_line)
            cur_line = w
            if len(lines) == 3:
                break
    if cur_line and len(lines) < 3:
        lines.append(cur_line)
    if len(lines) == 3 and len(clean_msg) > 150:
        lines[-1] = lines[-1][:53].rstrip() + "..."

    y_text = 345
    for ln in lines:
        draw.text((112, y_text), ln, fill="#cbd5e1", font=font_excerpt)
        y_text += 32

    # Badge inferior dourado
    draw.rounded_rectangle([112, 480, 565, 534], radius=12, fill="#d4af37")
    draw.text((138, 495), "DOCUMENTO COMPLETO EM ANEXO", fill="#0b1120", font=font_badge)

    out = io.BytesIO()
    img.save(out, format="PNG", optimize=True)
    out.seek(0)
    return out.getvalue()


def generate_and_upload_bussola_cover_image(
    lead_name: str,
    birth_date: str,
    message_text: str = ""
) -> str:
    """
    Gera a imagem de capa personalizada da Bússola (PNG) e faz upload no storage,
    retornando a URL pública.
    """
    from storage import storage
    img_bytes = generate_bussola_cover_image_bytes(lead_name, birth_date, message_text)
    _, safe_pdf_name = format_bussola_display_filename(lead_name)
    safe_png_name = safe_pdf_name.replace(".pdf", ".png")
    unique_filename = f"bussola_cover_{uuid4().hex[:12]}_{safe_png_name}"
    public_url = storage.upload_file(io.BytesIO(img_bytes), unique_filename, "image/png")
    logger.info(f"🖼️ [BUSSOLA_COVER] Capa personalizada gerada e disponível em: {public_url}")
    return public_url


def generate_and_upload_bussola_pdf(
    lead_name: str,
    birth_date: str,
    message_text: str,
    filename_prefix: str = "Leitura da Bússola"
) -> tuple[str, str]:
    """
    Gera o PDF da leitura da Bússola e realiza o upload no MinIO/S3 via storage,
    retornando (url_publica, nome_arquivo_exibicao).
    """
    from storage import storage
    logger.info(f"📄 [BUSSOLA_PDF] Iniciando geração de PDF Premium para lead: '{lead_name}'")
    pdf_bytes = generate_bussola_pdf_bytes(lead_name, birth_date, message_text)

    display_filename, safe_storage_name = format_bussola_display_filename(lead_name, filename_prefix)
    unique_storage_filename = f"bussola_pdf_{uuid4().hex[:12]}_{safe_storage_name}"

    file_obj = io.BytesIO(pdf_bytes)
    public_url = storage.upload_file(file_obj, unique_storage_filename, "application/pdf")
    logger.info(f"✅ [BUSSOLA_PDF] PDF gerado e disponível em: {public_url} (Nome exibição: {display_filename})")

    return public_url, display_filename


def ensure_trigger_document_link(db, trigger) -> list:
    """
    Verifica se o trigger possui um cabeçalho de documento ou imagem com link vazio ('')
    ou nome antigo com underscores e regenera o PDF / Capa a partir do processed_data
    ou do histórico de webhook correspondente.
    """
    import copy
    import models

    components = copy.deepcopy(trigger.template_components or [])
    needs_doc_fix = False
    needs_img_fix = False

    for comp in components:
        if comp.get("type") == "header":
            for param in comp.get("parameters", []):
                if param.get("type") == "document":
                    doc_obj = param.get("document", {})
                    if not doc_obj.get("link"):
                        needs_doc_fix = True
                    elif doc_obj.get("filename", "").startswith("Leitura_Bussola_"):
                        # Atualiza automaticamente nomes legados com underscore para o formato bonito
                        lead_name_fallback = trigger.contact_name or "Consulente"
                        pretty_fn, _ = format_bussola_display_filename(lead_name_fallback)
                        doc_obj["filename"] = pretty_fn
                elif param.get("type") == "image" and not param.get("image", {}).get("link"):
                    needs_img_fix = True

    if not needs_doc_fix and not needs_img_fix:
        return components

    p_data = dict(trigger.processed_data or {})
    bussola_msg = p_data.get("mensagem")
    birth_date = p_data.get("nascimento_completo") or p_data.get("nascimento_data") or ""

    if not bussola_msg and trigger.integration_id:
        h_entry = db.query(models.WebhookHistory).filter(
            models.WebhookHistory.integration_id == trigger.integration_id
        ).order_by(models.WebhookHistory.id.desc()).first()
        if h_entry:
            hp_data = h_entry.processed_data or {}
            h_payload = h_entry.payload or {}
            bussola_msg = (
                hp_data.get("mensagem")
                or h_payload.get("mensagem")
                or h_payload.get("variables", {}).get("mensagem")
            )
            if not birth_date:
                birth_date = hp_data.get("nascimento_completo") or hp_data.get("nascimento_data") or ""

    if bussola_msg:
        lead_name = trigger.contact_name or p_data.get("name") or "Consulente"
        if needs_doc_fix:
            try:
                pdf_url, display_filename = generate_and_upload_bussola_pdf(
                    lead_name=lead_name,
                    birth_date=birth_date,
                    message_text=bussola_msg
                )
                for comp in components:
                    if comp.get("type") == "header":
                        for param in comp.get("parameters", []):
                            if param.get("type") == "document":
                                param["document"]["link"] = pdf_url
                                param["document"]["filename"] = display_filename
                logger.info(f"🔄 [ENSURE_PDF_LINK] Link do documento regenerado com sucesso: {pdf_url}")
            except Exception as fix_err:
                logger.error(f"❌ [ENSURE_PDF_LINK] Erro ao regenerar PDF para o trigger {trigger.id}: {fix_err}")

        if needs_img_fix:
            try:
                cover_url = generate_and_upload_bussola_cover_image(
                    lead_name=lead_name,
                    birth_date=birth_date,
                    message_text=bussola_msg
                )
                for comp in components:
                    if comp.get("type") == "header":
                        for param in comp.get("parameters", []):
                            if param.get("type") == "image":
                                param["image"]["link"] = cover_url
                logger.info(f"🔄 [ENSURE_COVER_LINK] Capa de imagem regenerada com sucesso: {cover_url}")
            except Exception as img_err:
                logger.error(f"❌ [ENSURE_COVER_LINK] Erro ao regenerar capa para o trigger {trigger.id}: {img_err}")

    return components
