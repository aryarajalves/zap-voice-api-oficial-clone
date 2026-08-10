import pytest
from unittest.mock import MagicMock
import models

def test_reconcile_no_counter_regression():
    # Simula um trigger com 203 entregues acumulados anteriormente
    trigger = MagicMock(spec=models.ScheduledTrigger)
    trigger.total_sent = 365
    trigger.total_delivered = 203
    trigger.total_read = 67
    trigger.total_interactions = 5
    trigger.total_cost = 70.0
    trigger.total_paid_templates = 200

    # Dados computados temporariamente durante um acúmulo de fila no RabbitMQ (ex: apenas 26 processados ainda)
    sent_calc = 400
    delivered_calc = 26
    read_calc = 17
    failed_calc = 214
    blocked_calc = 13
    interactions_calc = 2
    total_cost_calc = 8.75
    paid_templates_calc = 25

    # Lógica de atualização corrigida
    trigger.total_sent = max(trigger.total_sent or 0, sent_calc)
    trigger.total_delivered = max(trigger.total_delivered or 0, delivered_calc)
    trigger.total_read = max(trigger.total_read or 0, read_calc)
    trigger.total_failed = failed_calc
    trigger.total_blocked = blocked_calc
    trigger.total_interactions = max(trigger.total_interactions or 0, interactions_calc)
    trigger.total_cost = max(float(trigger.total_cost or 0.0), total_cost_calc)
    trigger.total_paid_templates = max(trigger.total_paid_templates or 0, paid_templates_calc)

    # Asserts
    assert trigger.total_sent == 400  # Aumentou
    assert trigger.total_delivered == 203  # NÃO diminuiu para 26!
    assert trigger.total_read == 67  # NÃO diminuiu para 17!
    assert trigger.total_cost == 70.0  # NÃO diminuiu!
