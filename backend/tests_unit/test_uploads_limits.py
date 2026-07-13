import pytest
from fastapi import HTTPException
from unittest.mock import MagicMock, AsyncMock
from routers.uploads import upload_file

class MockFile:
    def __init__(self, filename, content_type, size):
        self.filename = filename
        self.content_type = content_type
        self.size = size
        self.file = MagicMock()
        
        # Simula o comportamento do arquivo no tell e seek para o tamanho
        self.file.tell.return_value = size

    async def seek(self, offset, whence=0):
        pass

@pytest.mark.asyncio
async def test_upload_file_limits():
    # 1. Teste de Imagem dentro do limite (4MB)
    mock_img_ok = MockFile("test.png", "image/png", 4 * 1024 * 1024)
    
    # 2. Teste de Imagem acima do limite (6MB)
    mock_img_limit = MockFile("large.png", "image/png", 6 * 1024 * 1024)
    db_mock = MagicMock()
    user_mock = MagicMock()
    
    with pytest.raises(HTTPException) as exc_info:
        await upload_file(
            file=mock_img_limit,
            x_client_id="1",
            db=db_mock,
            current_user=user_mock
        )
    assert exc_info.value.status_code == 400
    assert "Arquivo muito grande" in exc_info.value.detail
