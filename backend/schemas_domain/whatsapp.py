from pydantic import BaseModel, Field
from typing import List, Optional


class WhatsAppTemplateRequest(BaseModel):
    phone_number: str = Field(..., description="Número de destino (formato internacional sem +)", example="5511999999999")
    template_name: str = Field(..., description="Nome do template aprovado na Meta", example="hello_world")
    language: Optional[str] = Field("pt_BR", description="Código do idioma", example="pt_BR")
    components: Optional[List[dict]] = Field(
        default=[],
        description="Componentes para substituir variáveis {{1}}, {{2}}...",
        example=[
            {
                "type": "body",
                "parameters": [
                    {"type": "text", "text": "João"},
                    {"type": "text", "text": "1234"}
                ]
            }
        ]
    )


class WhatsAppTemplateCreate(BaseModel):
    name: str = Field(..., description="Nome do template (apenas letras minúsculas e underscores)", example="boas_vindas_campanha")
    category: str = Field("MARKETING", description="Categoria (MARKETING ou UTILITY)", example="MARKETING")
    language: str = Field("pt_BR", description="Idioma do template", example="pt_BR")
    header_type: Optional[str] = Field("NONE", description="Tipo de cabeçalho: NONE, TEXT, IMAGE, VIDEO, DOCUMENT")
    header_text: Optional[str] = Field(None, description="Texto do cabeçalho (se header_type=TEXT)")
    header_media_url: Optional[str] = Field(None, description="Link de exemplo para mídia (IMAGE, VIDEO, DOCUMENT)")
    body_text: str = Field(..., description="Texto do corpo da mensagem (suporta variáveis {{1}}, {{2}}...)")
    footer_text: Optional[str] = Field(None, description="Texto do rodapé")
    buttons: Optional[List[dict]] = Field(default=[], description="Lista de botões [{type: 'QUICK_REPLY', text: 'Sim'}]")


class TemplateTagsUpdate(BaseModel):
    tags: List[str] = Field(..., description="Lista de tags/etiquetas para o template")
