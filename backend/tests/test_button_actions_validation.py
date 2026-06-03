import sys
from unittest.mock import MagicMock

# Mock rabbitmq_client e config_loader antes de outros imports
sys.modules['rabbitmq_client'] = MagicMock()
sys.modules['rabbitmq_client'].rabbitmq = MagicMock()
sys.modules['config_loader'] = MagicMock()

import os
from datetime import datetime

# Adiciona o diretório atual no PATH caso necessário
sys.path.append(os.getcwd())

import schemas

def test_scheduled_trigger_button_actions_validation():
    # 1. Teste com button_actions como dicionário válido
    data_dict = {
        "id": 1,
        "created_at": datetime.now(),
        "status": "pending",
        "button_actions": {"btn_1": "action_funnel_2"}
    }
    trigger = schemas.ScheduledTrigger(**data_dict)
    assert trigger.button_actions == {"btn_1": "action_funnel_2"}

    # 2. Teste com button_actions como lista vazia [] (que causava o erro no FastAPI)
    data_list = {
        "id": 2,
        "created_at": datetime.now(),
        "status": "pending",
        "button_actions": []
    }
    trigger_list = schemas.ScheduledTrigger(**data_list)
    assert trigger_list.button_actions == {}

    # 3. Teste com button_actions como None
    data_none = {
        "id": 3,
        "created_at": datetime.now(),
        "status": "pending",
        "button_actions": None
    }
    trigger_none = schemas.ScheduledTrigger(**data_none)
    assert trigger_none.button_actions is None

    # 4. Teste com button_actions como string JSON válida
    data_str = {
        "id": 4,
        "created_at": datetime.now(),
        "status": "pending",
        "button_actions": '{"btn_2": "action_funnel_3"}'
    }
    trigger_str = schemas.ScheduledTrigger(**data_str)
    assert trigger_str.button_actions == {"btn_2": "action_funnel_3"}

    # 5. Teste com button_actions como string inválida ou outros tipos
    data_invalid = {
        "id": 5,
        "created_at": datetime.now(),
        "status": "pending",
        "button_actions": "invalid_string"
    }
    trigger_invalid = schemas.ScheduledTrigger(**data_invalid)
    assert trigger_invalid.button_actions == {}
