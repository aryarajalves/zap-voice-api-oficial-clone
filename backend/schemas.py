from pydantic import BaseModel, Field
from typing import List, Optional, Any, Union
from datetime import datetime

# --- Enums & Sub-models ---

class FunnelStep(BaseModel):
    type: str = Field(..., description="Tipo do passo (message, audio, video, image, delay)", example="message")
    content: Optional[str] = Field(None, description="Conteúdo da mensagem ou URL da mídia", example="Olá! Como posso ajudar?")
    # Delay options
    delay: Optional[int] = Field(0, description="Tempo de espera (se type=delay)", example=5)
    timeUnit: Optional[str] = Field("seconds", description="Unidade de tempo (seconds, minutes, hours, days)", example="seconds")
    # Typing options
    simulate_typing: Optional[bool] = Field(False, description="Simular 'digitando...' antes de enviar")
    typing_time: Optional[int] = Field(3, description="Tempo simulando digitação (segundos)")
    # Interactive options
    interactive: Optional[bool] = Field(False, description="Se verdadeiro, envia botões interativos (Meta API)")
    buttons: Optional[List[str]] = Field(None, description="Lista de textos para botões", example=["Sim", "Não"])
    # Private options
    privateMessageEnabled: Optional[bool] = Field(False, description="Enviar nota interna no Chatwoot após este passo")
    privateMessageContent: Optional[str] = Field(None, description="Conteúdo da nota interna")
    # File options
    fileName: Optional[str] = Field(None, description="Nome personalizado para o arquivo enviado", example="comprovante.pdf")

# --- Funnel Schemas ---

class FunnelBase(BaseModel):
    name: str = Field(..., description="Nome de identificação do funil", example="Funil de Boas Vindas")
    description: Optional[str] = Field(None, description="Descrição opcional para uso interno")
    trigger_phrase: Optional[str] = Field(None, description="Frase exata que dispara este funil (Match exato)", example="#start")
    allowed_phone: Optional[str] = Field(None, description="Se preenchido, apenas este número pode disparar o funil (ex: testes)", example="5511999999999")
    steps: Union[List[Any], dict] = Field(..., description="Lista sequencial de passos ou Grafo do Flow Builder")

class FunnelCreate(FunnelBase):
    pass

class Funnel(FunnelBase):
    id: int = Field(..., description="ID único do funil no banco de dados")

    class Config:
        from_attributes = True

class FunnelBulkDelete(BaseModel):
    funnel_ids: List[int] = Field(..., description="Lista de IDs de funis para excluir")

# --- Trigger Schemas ---

class ScheduledTriggerBase(BaseModel):
    funnel_id: Optional[int] = Field(None, description="ID do funil a ser executado")
    conversation_id: Optional[int] = Field(None, description="ID da conversa no Chatwoot")
    scheduled_time: datetime = Field(..., description="Data/Hora agendada para execução")
    status: str = Field(..., description="Status do agendamento (pending, queued, processing, completed, cancelled, failed)")
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None

class ScheduledTrigger(ScheduledTriggerBase):
    id: int
    created_at: datetime
    funnel: Optional[Funnel] = None
    
    # Bulk send fields
    is_bulk: bool = Field(False, description="Indica se faz parte de um envio em massa")
    template_name: Optional[str] = Field(None, description="Nome do template WhatsApp (se aplicável)")
    private_message: Optional[str] = Field(None, description="Mensagem privada para o Chatwoot")
    private_message_delay: int = 5
    private_message_concurrency: int = 1
    total_sent: int = 0
    total_failed: int = 0
    contacts_list: Optional[List[Union[dict, str]]] = Field(None, description="Lista de contatos alvo (para validação)")
    delay_seconds: int = Field(5, description="Intervalo entre envios (bulk)")
    concurrency_limit: int = 1
    cost_per_unit: float = 0.0
    total_cost: float = 0.0
    total_delivered: int = 0
    total_read: int = 0
    total_interactions: int = 0
    total_blocked: int = 0
    
    # New Field
    current_step_index: Optional[int] = Field(0, description="Índice do último passo executado no funil")
    current_node_id: Optional[str] = Field(None, description="ID do nó atual no grafo")
    processed_contacts: Optional[List[str]] = []
    pending_contacts: Optional[List[str]] = []
    failure_reason: Optional[str] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class TriggerListResponse(BaseModel):
    items: List[ScheduledTrigger]
    total: int

# --- WhatsApp Schemas ---

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
