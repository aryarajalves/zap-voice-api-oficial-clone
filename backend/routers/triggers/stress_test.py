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

    # Gerar contatos fictícios
    contacts_data = []
    for i in range(1, number_of_contacts + 1):
        phone = f"+551199999{i:04d}"
        contacts_data.append({
            "id": 100000 + i,
            "phone": phone,
            "name": f"Simulado Contato {i}",
            "inbox_id": 1,
            "meta": {
                "sender": {
                    "name": f"Simulado Contato {i}",
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

    for i in range(number):
        first = random.choice(_FIRST_NAMES)
        last = random.choice(_LAST_NAMES)
        name = f"{first} {last}"
        # Telefone único: 55 + 11 + 9 + 8 dígitos baseados no índice
        phone = f"5511{900000000 + i:09d}"
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

