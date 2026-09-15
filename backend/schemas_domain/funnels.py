from pydantic import BaseModel, Field
from typing import List, Optional, Any, Union
from datetime import datetime


class FunnelStep(BaseModel):
    type: str = Field(..., description="Tipo do passo (message, audio, video, image, delay)", example="message")
    content: Optional[str] = Field(None, description="Conteúdo da mensagem ou URL da mídia", example="Olá! Como posso ajudar?")
    delay: Optional[int] = Field(0, description="Tempo de espera (se type=delay)", example=5)
    timeUnit: Optional[str] = Field("seconds", description="Unidade de tempo (seconds, minutes, hours, days)", example="seconds")
    simulate_typing: Optional[bool] = Field(False, description="Simular 'digitando...' antes de enviar")
    typing_time: Optional[int] = Field(3, description="Tempo simulando digitação (segundos)")
    interactive: Optional[bool] = Field(False, description="Se verdadeiro, envia botões interativos (Meta API)")
    buttons: Optional[List[str]] = Field(None, description="Lista de textos para botões", example=["Sim", "Não"])
    privateMessageEnabled: Optional[bool] = Field(False, description="Enviar nota interna no Chatwoot após este passo")
    privateMessageContent: Optional[str] = Field(None, description="Conteúdo da nota interna")
    fileName: Optional[str] = Field(None, description="Nome personalizado para o arquivo enviado", example="comprovante.pdf")


class FunnelBase(BaseModel):
    name: str = Field(..., description="Nome de identificação do funil", example="Funil de Boas Vindas")
    description: Optional[str] = Field(None, description="Descrição opcional para uso interno")
    trigger_phrase: Optional[str] = Field(None, description="Palavra(s)-chave que disparam este funil", example="VALIDAR, AULA")
    trigger_match_type: Optional[str] = Field("contains", description="Tipo de correspondência: 'contains' ou 'exact'")
    trigger_limit_type: Optional[str] = Field("none", description="Limite de reativação por contato: 'none', 'once_per_day', 'once_24h', 'once_lifetime'")
    is_trigger_active: Optional[bool] = Field(True, description="Se o gatilho por palavra-chave está ativo")
    trigger_on_new_conversation: Optional[bool] = Field(False, description="Se o funil deve iniciar automaticamente em nova conversa no chat")
    trigger_new_conversation_mode: Optional[str] = Field("all", description="Modo de disparo em nova conversa: 'all' ou 'only_new_contacts'")
    allowed_phones: Optional[List[str]] = Field(None, description="Lista de telefones permitidos (Whitelist)")
    blocked_phones: Optional[List[str]] = Field(None, description="Lista de telefones bloqueados (Blacklist)")
    allowed_phone: Optional[str] = Field(None, description="Legado: apenas este número pode disparar", example="5511999999999")
    steps: Union[List[Any], dict] = Field(..., description="Lista sequencial de passos ou Grafo do Flow Builder")
    business_hours_start: Optional[str] = Field("08:00", description="Horário de início do período comercial (HH:MM, America/Sao_Paulo)", example="08:00")
    business_hours_end: Optional[str] = Field("18:00", description="Horário de fim do período comercial (HH:MM, America/Sao_Paulo)", example="18:00")
    business_hours_days: Optional[List[int]] = Field(default=[0,1,2,3,4], description="Dias da semana com horário comercial (0=Seg, 6=Dom)")
    is_archived: Optional[bool] = Field(False, description="Se verdadeiro, o funil está arquivado")
    tag: Optional[str] = Field(None, description="Etiqueta para classificar o funil")
    is_pinned: Optional[bool] = Field(False, description="Se verdadeiro, o funil está fixado no topo")
    is_active: Optional[bool] = Field(True, description="Se verdadeiro, o funil está ativo e pronto para uso")


class FunnelCreate(FunnelBase):
    pass


class Funnel(FunnelBase):
    id: int = Field(..., description="ID único do funil no banco de dados")
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class FunnelBulkDelete(BaseModel):
    funnel_ids: List[int] = Field(..., description="Lista de IDs de funis para excluir")


class FunnelBulkArchive(BaseModel):
    funnel_ids: List[int] = Field(..., description="Lista de IDs de funis para arquivar/desarquivar")
    is_archived: bool = Field(True, description="Status de arquivamento a ser aplicado")


class FunnelBulkTag(BaseModel):
    funnel_ids: List[int] = Field(..., description="Lista de IDs de funis para atualizar a etiqueta")
    tag: Optional[str] = Field(None, description="Etiqueta a ser aplicada (null para remover)")
