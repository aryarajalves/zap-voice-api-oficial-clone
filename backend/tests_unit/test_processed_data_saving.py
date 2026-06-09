import pytest
from sqlalchemy.orm.attributes import flag_modified
import models

def test_scheduled_trigger_processed_data_field(db_session):
    """Test that ScheduledTrigger model correctly maps and saves the processed_data column."""
    trigger = models.ScheduledTrigger(
        client_id=1,
        status='suspended',
        processed_data={}
    )
    db_session.add(trigger)
    db_session.commit()
    
    # Save a value
    trigger.processed_data["cpf"] = "05010030305"
    flag_modified(trigger, "processed_data")
    db_session.commit()
    
    # Query back
    db_session.refresh(trigger)
    assert trigger.processed_data == {"cpf": "05010030305"}
    assert trigger.processed_data.get("cpf") == "05010030305"
