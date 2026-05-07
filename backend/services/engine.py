import logging
import sys
import os

# Garante que o pacote core seja encontrado
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from core.engine import execute_funnel as _execute_funnel
from core.engine import log_node_execution as _log_node_execution
from core.engine.utils import trigger_to_dict as _trigger_to_dict

# Re-exportando para manter compatibilidade
execute_funnel = _execute_funnel
log_node_execution = _log_node_execution
trigger_to_dict = _trigger_to_dict

logger = logging.getLogger("FunnelEngine.Proxy")

async def validate_media_url(url: str) -> tuple[bool, str]:
    from core.engine.utils import validate_media_url as _validate_media_url
    return await _validate_media_url(url)

# Mantendo as funções utilitárias que podem ser usadas fora do contexto principal
def is_within_business_hours(funnel) -> bool:
    from core.engine.business_hours import is_within_business_hours as _is_within_business_hours
    return _is_within_business_hours(funnel)

def get_next_business_hour_start(funnel):
    from core.engine.business_hours import get_next_business_hour_start as _get_next_business_hour_start
    return _get_next_business_hour_start(funnel)

async def wait_for_delivery_sync(db, message_id, trigger, current_node_id, timeout=60):
    from core.engine.sync import wait_for_delivery_sync as _wait_for_delivery_sync
    return await _wait_for_delivery_sync(db, message_id, trigger, current_node_id, timeout)
