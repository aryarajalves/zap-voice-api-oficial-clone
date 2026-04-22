import pytest
import httpx
from unittest.mock import AsyncMock, patch, MagicMock
from chatwoot_client import ChatwootClient

@pytest.fixture
def mock_settings():
    with patch("config_loader.get_settings") as mock:
        mock.return_value = {
            "CHATWOOT_API_URL": "https://test.chatwoot.com",
            "CHATWOOT_API_TOKEN": "test_token",
            "CHATWOOT_ACCOUNT_ID": "1"
        }
        yield mock

@pytest.mark.asyncio
async def test_chatwoot_client_init(mock_settings):
    client = ChatwootClient(client_id=1)
    assert client.api_url == "https://test.chatwoot.com/api/v1"
    assert client.api_token == "test_token"
    assert client.account_id == "1"
    assert client.base_url == "https://test.chatwoot.com/api/v1/accounts/1"

@pytest.mark.asyncio
async def test_request_retry_on_429(mock_settings):
    client = ChatwootClient(client_id=1)
    
    # Mock httpx.AsyncClient.request to return 429 then 200
    mock_resp_429 = MagicMock(spec=httpx.Response)
    mock_resp_429.status_code = 429
    
    mock_resp_200 = MagicMock(spec=httpx.Response)
    mock_resp_200.status_code = 200
    mock_resp_200.json.return_value = {"success": True}
    
    with patch("httpx.AsyncClient.request", side_effect=[mock_resp_429, mock_resp_200]) as mock_request:
        with patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
            result = await client._request("GET", "test")
            
            assert result == {"success": True}
            assert mock_request.call_count == 2
            mock_sleep.assert_called_once()

@pytest.mark.asyncio
async def test_send_message_success(mock_settings):
    client = ChatwootClient(client_id=1)
    
    mock_resp = MagicMock(spec=httpx.Response)
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"id": 100, "content": "hello"}
    
    with patch("httpx.AsyncClient.request", return_value=mock_resp) as mock_request:
        result = await client.send_message(1, "hello")
        
        assert result["id"] == 100
        mock_request.assert_called_once()
        # Verify payload
        args, kwargs = mock_request.call_args
        assert kwargs["json"]["content"] == "hello"
        assert kwargs["json"]["private"] is False
        assert kwargs["json"]["message_type"] == "outgoing"

@pytest.mark.asyncio
async def test_send_private_note(mock_settings):
    client = ChatwootClient(client_id=1)
    
    mock_resp = MagicMock(spec=httpx.Response)
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"id": 101, "content": "note", "private": True}
    
    with patch("httpx.AsyncClient.request", return_value=mock_resp) as mock_request:
        result = await client.send_private_note(1, "note")
        
        assert result["private"] is True
        args, kwargs = mock_request.call_args
        assert kwargs["json"]["private"] is True
        assert "message_type" not in kwargs["json"]

@pytest.mark.asyncio
async def test_get_inboxes_filtering(mock_settings):
    # Test default WhatsApp filtering
    client = ChatwootClient(client_id=1)
    
    mock_resp = MagicMock(spec=httpx.Response)
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "payload": [
            {"id": 10, "name": "WA 1", "channel_type": "Channel::Whatsapp"},
            {"id": 20, "name": "Web", "channel_type": "Channel::WebWidget"}
        ]
    }
    
    with patch("httpx.AsyncClient.get", return_value=mock_resp):
        inboxes = await client.get_inboxes()
        assert len(inboxes) == 1
        assert inboxes[0]["id"] == 10

@pytest.mark.asyncio
async def test_get_inboxes_selected_ids(mock_settings):
    # Mock settings with selected IDs
    mock_settings.return_value["CHATWOOT_SELECTED_INBOX_ID"] = "20,30"
    client = ChatwootClient(client_id=1)
    
    mock_resp = MagicMock(spec=httpx.Response)
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "payload": [
            {"id": 10, "name": "WA 1", "channel_type": "Channel::Whatsapp"},
            {"id": 20, "name": "Web", "channel_type": "Channel::WebWidget"},
            {"id": 30, "name": "Other", "channel_type": "Channel::Email"}
        ]
    }
    
    with patch("httpx.AsyncClient.get", return_value=mock_resp):
        inboxes = await client.get_inboxes()
        assert len(inboxes) == 2
        ids = [i["id"] for i in inboxes]
        assert 20 in ids
        assert 30 in ids

@pytest.mark.asyncio
async def test_get_all_conversations_pagination(mock_settings):
    client = ChatwootClient(client_id=1)
    
    # Mock two pages of results
    # Page 1: 25 items to trigger next page
    page1 = [{"id": i} for i in range(1, 26)]
    # Page 2: 2 items
    page2 = [{"id": 26}, {"id": 27}]
    
    # Mock responses for AsyncClient.get
    mock_resp1 = MagicMock(spec=httpx.Response)
    mock_resp1.status_code = 200
    mock_resp1.json.return_value = {"payload": page1}
    
    mock_resp2 = MagicMock(spec=httpx.Response)
    mock_resp2.status_code = 200
    mock_resp2.json.return_value = {"payload": page2}
    
    with patch("httpx.AsyncClient.get", side_effect=[mock_resp1, mock_resp2]) as mock_get:
        conversations = await client.get_all_conversations()
        
        assert len(conversations) == 27
        assert mock_get.call_count == 2
        # Verify page params
        args1, kwargs1 = mock_get.call_args_list[0]
        assert kwargs1["params"]["page"] == 1
        args2, kwargs2 = mock_get.call_args_list[1]
        assert kwargs2["params"]["page"] == 2

@pytest.mark.asyncio
async def test_get_contact_conversations_success(mock_settings):
    client = ChatwootClient(client_id=1)
    
    search_result = {
        "payload": [{"id": 500, "phone_number": "+5585999999999"}]
    }
    
    conv_result = {
        "payload": [{"id": 1000, "last_activity_at": "2023-01-01T00:00:00Z"}]
    }
    
    with patch.object(ChatwootClient, "_request", side_effect=[search_result, conv_result]) as mock_req:
        results = await client.get_contact_conversations("85999999999")
        
        assert isinstance(results, list)
        assert len(results) == 1
        assert results[0]["id"] == 1000
        assert results[0]["last_activity_at"] == "2023-01-01T00:00:00Z"
        assert mock_req.call_count == 2

@pytest.mark.asyncio
async def test_send_attachment_local_file(mock_settings):
    client = ChatwootClient(client_id=1)
    
    # Mock file existence and open
    with patch("os.path.exists", return_value=True), \
         patch("builtins.open", MagicMock()), \
         patch("mimetypes.guess_type", return_value=("audio/mpeg", None)):
        
        mock_resp = MagicMock(spec=httpx.Response)
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"id": 2000}
        
        with patch("httpx.AsyncClient.post", return_value=mock_resp) as mock_post:
            result = await client.send_attachment(1, "http://localhost/static/uploads/test.mp3", "audio")
            
            assert result["id"] == 2000
            assert mock_post.call_count == 1
            # Verify audio/ogg fix for PTT
            args, kwargs = mock_post.call_args
            assert "attachments[]" in kwargs["files"]
            assert kwargs["files"]["attachments[]"][2] == "audio/ogg"

@pytest.mark.asyncio
async def test_send_attachment_download_fallback(mock_settings):
    client = ChatwootClient(client_id=1)
    
    # Mock file NOT existing locally
    mock_exists = MagicMock(side_effect=[False, False])
    
    # Mock download response
    mock_dl_resp = MagicMock(spec=httpx.Response)
    mock_dl_resp.status_code = 200
    mock_dl_resp.content = b"fake_data"
    
    # Mock Chatwoot upload response
    mock_upload_resp = MagicMock(spec=httpx.Response)
    mock_upload_resp.status_code = 200
    mock_upload_resp.json.return_value = {"id": 3000}

    with patch("os.path.exists", mock_exists), \
         patch("httpx.AsyncClient.get", return_value=mock_dl_resp) as mock_get, \
         patch("httpx.AsyncClient.request", return_value=mock_upload_resp), \
         patch("builtins.open", MagicMock()):
        
        # After download, it should check exists again (mock it to return True the 3rd time if needed, 
        # but in current logic it uses the temp path)
        # We need a more careful mock here.
        
        with patch("os.remove", MagicMock()):
             result = await client.send_attachment(1, "https://external.com/file.png", "image")
             assert result["id"] == 3000
             mock_get.assert_called_once_with("https://external.com/file.png")

@pytest.mark.asyncio
async def test_send_template_meta_api(mock_settings):
    # Mock specific Meta settings
    mock_settings.return_value["WA_PHONE_NUMBER_ID"] = "phone_id_123"
    mock_settings.return_value["WA_ACCESS_TOKEN"] = "meta_token_abc"
    
    client = ChatwootClient(client_id=1)
    
    mock_resp = MagicMock(spec=httpx.Response)
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"messaging_product": "whatsapp", "messages": [{"id": "wa_msg_id"}]}
    mock_resp.headers = {}

    with patch("httpx.AsyncClient.post", return_value=mock_resp) as mock_post:
        result = await client.send_template(
            phone_number="5585999999999",
            template_name="hello_world",
            components=[{"type": "body", "parameters": [{"type": "text", "text": "Arya"}]}]
        )
        
        assert "messages" in result
        assert mock_post.call_count == 1
        # Verify URL and payload
        args, kwargs = mock_post.call_args
        assert "phone_id_123/messages" in args[0]
        assert kwargs["json"]["template"]["name"] == "hello_world"
        assert kwargs["headers"]["Authorization"] == "Bearer meta_token_abc"
