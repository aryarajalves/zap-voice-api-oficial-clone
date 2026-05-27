import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from fastapi import HTTPException
from routers.whatsapp import list_templates, archive_template, unarchive_template
import models

class MockUser:
    def __init__(self, client_id=1):
        self.client_id = client_id

@pytest.mark.asyncio
@patch("routers.whatsapp.ChatwootClient")
async def test_list_templates_filters_archived(mock_cw_client, db_session):
    # Setup mock templates
    mock_instance = MagicMock()
    mock_cw_client.return_value = mock_instance
    mock_instance.get_whatsapp_templates.return_value = [
        {"id": "1", "name": "template_one", "language": "pt_BR", "category": "MARKETING"},
        {"id": "2", "name": "template_two", "language": "pt_BR", "category": "MARKETING"}
    ]

    # Clear existing and add an archived template to DB cache
    db_session.query(models.WhatsAppTemplateCache).delete()
    db_session.commit()

    db_session.add(models.WhatsAppTemplateCache(
        id=1, client_id=1, name="template_one", language="pt_BR", body="Body 1", is_archived=True
    ))
    db_session.add(models.WhatsAppTemplateCache(
        id=2, client_id=1, name="template_two", language="pt_BR", body="Body 2", is_archived=False
    ))
    db_session.commit()

    # Test list_templates with include_archived=False (default)
    res = await list_templates(include_archived=False, x_client_id=1, current_user=MockUser(1), db=db_session)
    assert len(res) == 1
    assert res[0]["name"] == "template_two"

    # Test list_templates with include_archived=True
    res_all = await list_templates(include_archived=True, x_client_id=1, current_user=MockUser(1), db=db_session)
    assert len(res_all) == 2
    names = [t["name"] for t in res_all]
    assert "template_one" in names
    assert "template_two" in names

@pytest.mark.asyncio
async def test_archive_and_unarchive_template(db_session):
    db_session.query(models.WhatsAppTemplateCache).delete()
    db_session.commit()

    db_session.add(models.WhatsAppTemplateCache(
        id=99, client_id=1, name="test_archive_template", language="pt_BR", body="Body text", is_archived=False
    ))
    db_session.commit()

    # Test archive
    res_arch = await archive_template(template_name="test_archive_template", x_client_id=1, current_user=MockUser(1), db=db_session)
    assert res_arch["status"] == "success"
    
    db_tpl = db_session.query(models.WhatsAppTemplateCache).filter_by(name="test_archive_template", client_id=1).first()
    assert db_tpl.is_archived is True

    # Test unarchive
    res_unarch = await unarchive_template(template_name="test_archive_template", x_client_id=1, current_user=MockUser(1), db=db_session)
    assert res_unarch["status"] == "success"
    
    db_tpl = db_session.query(models.WhatsAppTemplateCache).filter_by(name="test_archive_template", client_id=1).first()
    assert db_tpl.is_archived is False

@pytest.mark.asyncio
@patch("routers.whatsapp.ChatwootClient")
async def test_list_templates_filters_paused(mock_cw_client, db_session):
    # Setup mock templates, one approved and one paused
    mock_instance = MagicMock()
    mock_cw_client.return_value = mock_instance
    mock_instance.get_whatsapp_templates = AsyncMock(return_value=[
        {"id": "10", "name": "template_active", "language": "pt_BR", "category": "MARKETING", "status": "APPROVED"},
        {"id": "11", "name": "template_paused", "language": "pt_BR", "category": "MARKETING", "status": "PAUSED"}
    ])

    # Test list_templates with include_paused=True (default)
    res_all = await list_templates(include_paused=True, x_client_id=1, current_user=MockUser(1), db=db_session)
    assert len(res_all) == 2
    names = [t["name"] for t in res_all]
    assert "template_active" in names
    assert "template_paused" in names

    # Test list_templates with include_paused=False
    res_filtered = await list_templates(include_paused=False, x_client_id=1, current_user=MockUser(1), db=db_session)
    assert len(res_filtered) == 1
    assert res_filtered[0]["name"] == "template_active"

