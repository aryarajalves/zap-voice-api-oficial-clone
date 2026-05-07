import sys
import os
import pytest
from unittest.mock import MagicMock
from sqlalchemy.orm import Session

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import models
from services.triggers_service import increment_read_stats

def test_increment_read_stats_idempotency():
    """
    Testa se o increment_read_stats é idempotente e não conta o mesmo read duas vezes.
    """
    mock_db = MagicMock(spec=Session)
    
    # Setup trigger
    trigger = models.ScheduledTrigger()
    trigger.id = 1
    trigger.total_read = 0
    
    # Setup message record
    message_record = models.MessageStatus()
    message_record.id = 100
    message_record.read_counted = False
    
    # Configure DB mock para retornar o message_record
    mock_query = mock_db.query.return_value
    mock_filter = mock_query.filter.return_value
    mock_with_for_update = mock_filter.with_for_update.return_value
    mock_with_for_update.first.return_value = message_record
    
    # Primeira chamada: deve retornar True e setar read_counted como True
    result1 = increment_read_stats(mock_db, trigger, message_record)
    
    assert result1 is True
    assert message_record.read_counted is True
    assert mock_db.execute.call_count == 1
    assert mock_db.commit.call_count == 1
    
    # Segunda chamada (simulando webhook duplicado) com o mesmo objeto message_record
    result2 = increment_read_stats(mock_db, trigger, message_record)
    
    # Deve retornar False e não chamar execute nem commit novamente
    assert result2 is False
    assert mock_db.execute.call_count == 1
    assert mock_db.commit.call_count == 1

def test_increment_read_stats_db_fetch_already_counted():
    """
    Testa se o increment_read_stats lida corretamente quando o registro no BD já tem read_counted=True,
    mesmo que a instância local tenha False.
    """
    mock_db = MagicMock(spec=Session)
    
    trigger = models.ScheduledTrigger()
    trigger.id = 1
    
    local_record = models.MessageStatus()
    local_record.id = 100
    local_record.read_counted = False
    
    # Registro que vem do banco de dados (simulando concorrência)
    db_record = models.MessageStatus()
    db_record.id = 100
    db_record.read_counted = True
    
    # Configure DB mock
    mock_query = mock_db.query.return_value
    mock_filter = mock_query.filter.return_value
    mock_with_for_update = mock_filter.with_for_update.return_value
    mock_with_for_update.first.return_value = db_record
    
    result = increment_read_stats(mock_db, trigger, local_record)
    
    assert result is False
    assert mock_db.execute.call_count == 0
    assert mock_db.commit.call_count == 0
