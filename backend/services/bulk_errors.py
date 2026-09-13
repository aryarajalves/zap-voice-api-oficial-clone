def translate_meta_error(reason: str) -> str:
    """
    Traduz códigos e mensagens de erro da API do WhatsApp Cloud (Meta) para mensagens amigáveis em português.
    """
    if not reason:
        return reason
    if "132015" in reason or "paused due to low quality" in reason:
        return "(#132015) O template está temporariamente indisponível para uso porque foi pausado devido à baixa qualidade."
    if "131049" in reason or "healthy ecosystem engagement" in reason:
        return "Erro Meta 131049: Esta mensagem não foi entregue para manter o engajamento saudável do ecossistema."
    if "131026" in reason or "undeliverable" in reason.lower():
        return "Erro Meta 131026: Mensagem não entregável"
    if "(#2)" in reason or "service temporarily unavailable" in reason.lower():
        return "(#2) Serviço temporariamente indisponível (Erro do Servidor da Meta)"
    if "131000" in reason or "something went wrong" in reason.lower():
        return "(#131000) Algo deu errado (Erro do Servidor da Meta)"
    if "too many requests" in reason.lower() or "rate limit" in reason.lower() or "limit reached" in reason.lower():
        return "(#80007) Limite de requisições excedido. Aumente o delay entre os disparos."
    return reason
