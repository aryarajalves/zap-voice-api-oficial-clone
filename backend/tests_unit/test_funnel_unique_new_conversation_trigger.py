import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import models, schemas
from routers.funnels import create_funnel, update_funnel, get_active_new_conversation_trigger

def setup_test_db():
    engine = create_engine("sqlite:///:memory:")
    models.Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    client = models.Client(id=1, name="Cliente Teste Unicidade")
    db.add(client)
    db.commit()
    return db

def test_unique_new_conversation_trigger_on_create():
    db = setup_test_db()
    user = models.User(id=1, role="super_admin", client_id=1)

    # 1. Cria primeiro funil com gatilho de nova conversa ativo
    payload1 = schemas.FunnelCreate(
        name="Funil 1 - Boas Vindas",
        steps={"nodes": [], "edges": []},
        trigger_on_new_conversation=True
    )
    f1 = create_funnel(funnel=payload1, x_client_id=1, db=db, current_user=user)
    assert f1.id is not None
    assert f1.trigger_on_new_conversation is True

    # 2. Verifica se a rota de consulta retorna o funil 1
    active_info = get_active_new_conversation_trigger(x_client_id=1, db=db, current_user=user)
    assert active_info["funnel_id"] == f1.id
    assert active_info["funnel_name"] == "Funil 1 - Boas Vindas"

    # 3. Tenta criar segundo funil com o mesmo gatilho ativo -> DEVE FALHAR (400)
    payload2 = schemas.FunnelCreate(
        name="Funil 2 - Tentativa Duplicada",
        steps={"nodes": [], "edges": []},
        trigger_on_new_conversation=True
    )
    with pytest.raises(HTTPException) as exc_info:
        create_funnel(funnel=payload2, x_client_id=1, db=db, current_user=user)
    
    assert exc_info.value.status_code == 400
    assert "Apenas 1 único funil pode ter o gatilho de Nova Conversa ativo" in exc_info.value.detail
    assert "Funil 1 - Boas Vindas" in exc_info.value.detail


def test_unique_new_conversation_trigger_on_update():
    db = setup_test_db()
    user = models.User(id=1, role="super_admin", client_id=1)

    # Cria Funil 1 com gatilho ativo
    payload1 = schemas.FunnelCreate(
        name="Funil Alpha",
        steps={"nodes": [], "edges": []},
        trigger_on_new_conversation=True
    )
    f1 = create_funnel(funnel=payload1, x_client_id=1, db=db, current_user=user)

    # Cria Funil 2 com gatilho DESATIVADO
    payload2 = schemas.FunnelCreate(
        name="Funil Beta",
        steps={"nodes": [], "edges": []},
        trigger_on_new_conversation=False
    )
    f2 = create_funnel(funnel=payload2, x_client_id=1, db=db, current_user=user)
    assert f2.trigger_on_new_conversation is False

    # Tenta atualizar Funil Beta para ativar o gatilho enquanto Alpha está ativo -> DEVE FALHAR
    update_payload_beta = schemas.FunnelCreate(
        name="Funil Beta",
        steps={"nodes": [], "edges": []},
        trigger_on_new_conversation=True
    )
    with pytest.raises(HTTPException) as exc_info:
        update_funnel(funnel_id=f2.id, funnel_update=update_payload_beta, x_client_id=1, db=db, current_user=user)
    
    assert exc_info.value.status_code == 400
    assert "Funil Alpha" in exc_info.value.detail

    # Desativa no Funil Alpha
    update_payload_alpha = schemas.FunnelCreate(
        name="Funil Alpha",
        steps={"nodes": [], "edges": []},
        trigger_on_new_conversation=False
    )
    update_funnel(funnel_id=f1.id, funnel_update=update_payload_alpha, x_client_id=1, db=db, current_user=user)
    assert f1.trigger_on_new_conversation is False

    # Agora deve permitir ativar no Funil Beta com sucesso
    updated_f2 = update_funnel(funnel_id=f2.id, funnel_update=update_payload_beta, x_client_id=1, db=db, current_user=user)
    assert updated_f2.trigger_on_new_conversation is True

    # Verifica consulta atualizada
    active_info = get_active_new_conversation_trigger(x_client_id=1, db=db, current_user=user)
    assert active_info["funnel_id"] == f2.id
    assert active_info["funnel_name"] == "Funil Beta"
