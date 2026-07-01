import pytest
from models import Client, ScheduledTrigger, MessageStatus, WebhookLead
from chatwoot_client import ChatwootClient
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone

@pytest.mark.asyncio
async def test_immediate_bsud_fallback(db_session):
    # 1. Criar cliente e lead mapeado com BSUD
    client = Client(name="BSUDFallbackClient")
    db_session.add(client)
    db_session.commit()
    db_session.refresh(client)

    lead = WebhookLead(
        client_id=client.id,
        phone="5585996123586",
        bsud="BR.2035734117013218",
        platform="hotmart",
        last_event_type="compra_aprovada"
    )
    db_session.add(lead)
    db_session.commit()

    # 2. Instanciar o ChatwootClient
    cw = ChatwootClient(client_id=client.id)

    # 3. Mockar send_template do _wa para falhar na primeira chamada (com o número bruto) e suceder na segunda (com o BSUD)
    wa_mock = AsyncMock()
    # Primeira chamada retorna erro, segunda retorna sucesso
    wa_mock.send_template.side_effect = [
        {"error": True, "detail": "Message undeliverable"},
        {"messages": [{"id": "wamid.success_fallback"}], "success": True}
    ]
    cw._wa = wa_mock

    # Executar o disparo do template
    res = await cw.send_template(
        contact_phone="5585996123586",
        template_name="test_template"
    )

    # 4. Validar se o wa_mock foi chamado duas vezes e o retorno foi sucesso (fallback)
    assert wa_mock.send_template.call_count == 2
    # Primeira chamada foi para o número bruto
    assert wa_mock.send_template.call_args_list[0][0][0] == "5585996123586"
    # Segunda chamada (fallback) foi para o BSUD
    assert wa_mock.send_template.call_args_list[1][0][0] == "BR.2035734117013218"
    assert res.get("success") is True

    # Cleanup
    db_session.delete(lead)
    db_session.delete(client)
    db_session.commit()
