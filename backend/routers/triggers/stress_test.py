from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Optional
import random
import models
from core.deps import get_current_user, get_db, get_validated_client_id
from rabbitmq_client import rabbitmq

# ─── Dados para geração aleatória de contatos ────────────────────────────────
_FIRST_NAMES = [
    "Ana", "Carlos", "Beatriz", "Diego", "Fernanda", "Gabriel", "Helena",
    "Igor", "Juliana", "Kevin", "Larissa", "Marcos", "Natalia", "Otávio",
    "Patricia", "Rafael", "Sabrina", "Thiago", "Ursula", "Vinícius",
    "Aline", "Bruno", "Camila", "Daniel", "Elaine", "Felipe", "Gisele",
    "Hugo", "Isabela", "João", "Karla", "Leonardo", "Mariana", "Nicolas",
    "Olivia", "Paulo", "Renata", "Sandro", "Tatiane", "Ulisses",
]
_LAST_NAMES = [
    "Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira",
    "Alves", "Pereira", "Lima", "Gomes", "Costa", "Ribeiro", "Martins",
    "Carvalho", "Almeida", "Lopes", "Sousa", "Fernandes", "Vieira",
    "Barbosa", "Rocha", "Dias", "Nascimento", "Andrade", "Moreira",
]
_TAG_POOL = [
    "lead-quente", "interessado", "comprador", "assinante", "suporte",
    "recompra", "indicacao", "evento-2025", "lista-vip", "ativo",
    "trial", "inativo", "promotor", "prospect", "recuperacao",
]

_SCALE_TEST_DDIS = [
    # 🇧🇷 BRASIL (+55) — Todos os 67 DDDs do Brasil
    ("55", "11"), ("55", "12"), ("55", "13"), ("55", "14"), ("55", "15"), ("55", "16"), ("55", "17"), ("55", "18"), ("55", "19"), # SP
    ("55", "21"), ("55", "22"), ("55", "24"), # RJ
    ("55", "27"), ("55", "28"), # ES
    ("55", "31"), ("55", "32"), ("55", "33"), ("55", "34"), ("55", "35"), ("55", "37"), ("55", "38"), # MG
    ("55", "41"), ("55", "42"), ("55", "43"), ("55", "44"), ("55", "45"), ("55", "46"), # PR
    ("55", "47"), ("55", "48"), ("55", "49"), # SC
    ("55", "51"), ("55", "53"), ("55", "54"), ("55", "55"), # RS
    ("55", "61"), ("55", "62"), ("55", "63"), ("55", "64"), ("55", "65"), ("55", "66"), ("55", "67"), ("55", "68"), ("55", "69"), # CO / Norte
    ("55", "71"), ("55", "73"), ("55", "74"), ("55", "75"), ("55", "77"), ("55", "79"), # Nordeste (BA/SE)
    ("55", "81"), ("55", "82"), ("55", "83"), ("55", "84"), ("55", "85"), ("55", "86"), ("55", "87"), ("55", "88"), ("55", "89"), # Nordeste (PE/AL/PB/RN/CE/PI)
    ("55", "91"), ("55", "92"), ("55", "93"), ("55", "94"), ("55", "95"), ("55", "96"), ("55", "97"), ("55", "98"), ("55", "99"), # Norte (PA/AM/RR/AP/MA)
    # 🌎 INTERNACIONAL (Diversos países e áreas)
    ("1", "212"), ("1", "305"), ("1", "310"), ("1", "415"), ("1", "312"), # EUA (+1)
    ("351", "91"), ("351", "92"), ("351", "96"), # Portugal (+351)
    ("34", "61"), ("34", "91"), # Espanha (+34)
    ("54", "11"), ("54", "351"), # Argentina (+54)
    ("52", "55"), ("52", "33"), # México (+52)
    ("44", "20"), ("44", "161"), # Reino Unido (+44)
    ("39", "06"), ("39", "02"), # Itália (+39)
    ("33", "01"), ("33", "04"), # França (+33)
    ("49", "30"), ("49", "89"), # Alemanha (+49)
    ("56", "02"), ("56", "32"), # Chile (+56)
    ("57", "601"), ("57", "604"), # Colômbia (+57)
    ("598", "99"), ("598", "98"), # Uruguai (+598)
    ("595", "981"), ("595", "971"), # Paraguai (+595)
]

router = APIRouter()

@router.post("/stress-test", summary="Iniciar um Teste de Estresse e Escala")
async def start_stress_test(
    payload: dict = Body(...),
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Cria e inicia imediatamente um disparo simulado em massa para testar a escalabilidade do sistema.
    """
    funnel_id = payload.get("funnel_id")
    template_name = payload.get("template_name")
    number_of_contacts = payload.get("number_of_contacts", 100)
    delay_seconds = payload.get("delay_seconds", 0) # Sem delay por padrão para testar estresse máximo
    concurrency_limit = payload.get("concurrency_limit", 5)
    pricing_category = payload.get("pricing_category", "marketing")

    interaction_funnel_id = payload.get("interaction_funnel_id")
    block_funnel_id = payload.get("block_funnel_id")

    cost_per_unit = 0.35 if pricing_category == "marketing" else 0.07

    if not funnel_id and not template_name:
        raise HTTPException(status_code=400, detail="Forneça um funnel_id ou template_name para testar")

    if number_of_contacts <= 0 or number_of_contacts > 20000:
        raise HTTPException(status_code=400, detail="O número de contatos deve ser entre 1 e 20.000")

    # Gerar contatos fictícios com DDIs variados
    contacts_data = []
    ddi_count = len(_SCALE_TEST_DDIS)
    for i in range(1, number_of_contacts + 1):
        ddi, ddd = _SCALE_TEST_DDIS[(i - 1) % ddi_count]
        first_name = _FIRST_NAMES[(i - 1) % len(_FIRST_NAMES)]
        last_name = _LAST_NAMES[(i - 1) % len(_LAST_NAMES)]
        contact_name = f"{first_name} {last_name}"
        if ddi == "55":
            phone = f"55{ddd}9{10000000 + i}"
        elif ddi == "1":
            phone = f"1{ddd}{1000000 + i}"
        else:
            phone = f"{ddi}{ddd}9{100000 + i}"
        contacts_data.append({
            "id": 100000 + i,
            "phone": phone,
            "name": contact_name,
            "inbox_id": 1,
            "meta": {
                "sender": {
                    "name": contact_name,
                    "phone_number": phone
                }
            }
        })

    simulated_error_reasons = payload.get("simulated_error_reasons")
    processed_data = {}
    if simulated_error_reasons and isinstance(simulated_error_reasons, list):
        processed_data["simulated_error_reasons"] = simulated_error_reasons

    # Criar trigger no banco
    trigger = models.ScheduledTrigger(
        client_id=x_client_id,
        funnel_id=funnel_id,
        template_name=template_name,
        template_language="pt_BR",
        status='processing', # Começa imediatamente em processing
        is_bulk=True,
        is_stress_test=True,
        contacts_list=contacts_data,
        total_contacts=number_of_contacts,
        scheduled_time=datetime.now(timezone.utc),
        delay_seconds=delay_seconds,
        concurrency_limit=concurrency_limit,
        product_name="SCALE_TEST",
        cost_per_unit=cost_per_unit,
        processed_data=processed_data,
        interaction_funnel_id=interaction_funnel_id,
        block_funnel_id=block_funnel_id
    )

    db.add(trigger)
    db.commit()
    db.refresh(trigger)

    # Publicar diretamente na fila para início imediato
    rabbit_payload = {
        "trigger_id": trigger.id,
        "funnel_id": trigger.funnel_id,
        "template_name": trigger.template_name,
        "contacts": contacts_data,
        "delay": delay_seconds,
        "concurrency": concurrency_limit,
        "language": "pt_BR",
        "type": "funnel_bulk" if trigger.funnel_id else "template_bulk",
        "interaction_funnel_id": interaction_funnel_id,
        "block_funnel_id": block_funnel_id
    }

    # Notificar Frontend via WS (RabbitMQ Events)
    await rabbitmq.publish_event("trigger_updated", {
        "trigger_id": trigger.id,
        "client_id": trigger.client_id,
        "status": "processing"
    })

    # Publicar na fila de bulk
    await rabbitmq.publish("zapvoice_bulk_sends", rabbit_payload)

    return {
        "status": "success",
        "message": f"Teste de estresse com {number_of_contacts} contatos enfileirado com sucesso",
        "trigger_id": trigger.id
    }


@router.post("/stress-test/contacts", summary="Importar contatos falsos para o banco de contatos")
def stress_test_contacts(
    payload: dict = Body(...),
    x_client_id: int = Depends(get_validated_client_id),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Gera N contatos fictícios com nomes, emails e etiquetas aleatórias
    e os insere diretamente na tabela de contatos (webhook_leads).
    Útil para testar a performance da página de contatos com grandes volumes.
    """
    number = payload.get("number_of_contacts", 100)
    n_tags = max(1, min(15, payload.get("number_of_random_tags", 3)))  # 1-15 etiquetas por contato

    if number <= 0 or number > 50000:
        raise HTTPException(status_code=400, detail="O número de contatos deve ser entre 1 e 50.000")

    # Etiqueta identificadora desta importação de teste
    test_tag = f"stress-test-{datetime.now(timezone.utc).strftime('%Y%m%d')}"

    # Descobrir project_id do cliente
    active_client = db.query(models.Client).filter(models.Client.id == x_client_id).first()
    proj_id = active_client.project_id if active_client else None

    now = datetime.now(timezone.utc)
    to_insert = []

    ddi_count = len(_SCALE_TEST_DDIS)
    for i in range(number):
        first = random.choice(_FIRST_NAMES)
        last = random.choice(_LAST_NAMES)
        name = f"{first} {last}"
        ddi, ddd = _SCALE_TEST_DDIS[i % ddi_count]
        phone = f"{ddi}{ddd}9{1000000 + i:06d}"
        email = f"{first.lower()}.{last.lower()}{i}@teste-escala.com"

        # N etiquetas aleatórias do pool + etiqueta identificadora do teste
        random_tags = random.sample(_TAG_POOL, min(n_tags, len(_TAG_POOL)))
        all_tags = list(dict.fromkeys([test_tag] + random_tags))
        tags_str = ", ".join(all_tags)

        to_insert.append({
            "client_id": x_client_id,
            "project_id": proj_id,
            "imported_by_client_id": x_client_id,
            "name": name,
            "phone": phone,
            "email": email,
            "last_event_type": "stress_test_import",
            "last_event_at": now,
            "platform": "stress_test",
            "tags": tags_str,
            "total_events": 1,
            "created_at": now,
            "updated_at": now,
        })

    # Inserção em lote
    db.bulk_insert_mappings(models.WebhookLead, to_insert)
    db.commit()

    return {
        "status": "success",
        "imported": number,
        "test_tag": test_tag,
        "message": f"{number} contatos fictícios importados com sucesso.",
    }

