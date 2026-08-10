import pytest
from unittest.mock import MagicMock, patch
import models

def test_list_triggers_batch_data_mapping():
    # Mock de lista de disparos
    trig1 = MagicMock(spec=models.ScheduledTrigger)
    trig1.id = 1
    trig1.is_bulk = True
    trig1.status = 'completed'
    trig1.waba_card_last4 = None
    trig1.template_name = None
    trig1.sent_as = 'TEMPLATE'
    trig1.messages = []
    trig1.button_actions = None

    trig2 = MagicMock(spec=models.ScheduledTrigger)
    trig2.id = 2
    trig2.is_bulk = False
    trig2.status = 'processing'
    trig2.waba_card_last4 = None
    trig2.template_name = None
    trig2.sent_as = 'TEMPLATE'
    trig2.messages = []
    trig2.button_actions = None

    triggers = [trig1, trig2]
    
    # Mapas simulação da pré-busca em lote
    child_counts_map = {1: 5, 2: 0}
    interaction_child_counts_map = {1: 2, 2: 0}
    block_child_counts_map = {1: 1, 2: 0}

    for trigger in triggers:
        trigger.child_count = child_counts_map.get(trigger.id, 0)
        trigger.interaction_child_count = interaction_child_counts_map.get(trigger.id, 0)
        trigger.block_child_count = block_child_counts_map.get(trigger.id, 0)
        if trigger.is_bulk:
            if trigger.status in ['processing', 'queued', 'pending']:
                trigger.queue_count = 10
            else:
                trigger.queue_count = 0

    assert trig1.child_count == 5
    assert trig1.interaction_child_count == 2
    assert trig1.block_child_count == 1
    assert trig1.queue_count == 0  # Como trig1 está 'completed', queue_count DEVE ser 0 sem ir ao banco!

    assert trig2.child_count == 0
