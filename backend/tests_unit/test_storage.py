
import pytest
from storage import StorageClient
import os

def test_s3_connection_and_upload():
    """
    Testa a conexão com o S3 e um upload de arquivo pequeno.
    Se o S3 estiver desativado por erro de configuração, o teste deve passar
    validando o modo Local ( fallback seguro ).
    """
    storage = StorageClient()
    
    test_filename = "test_unit_zapvoice.txt"
    test_content = b"Unit Test Content"
    from io import BytesIO
    file_obj = BytesIO(test_content)
    
    try:
        url = storage.upload_file(file_obj, test_filename, "text/plain")
        
        # Se o S3 estiver ativo, a URL deve conter o endpoint do S3
        # Se estiver em fallback local, deve começar com /static/uploads
        if storage.s3_client:
            assert os.getenv("S3_ENDPOINT_URL") in url or os.getenv("S3_PUBLIC_URL") in url
            print(f"✅ S3 Upload OK: {url}")
            # Limpeza
            storage.s3_client.delete_object(Bucket=storage.bucket_name, Key=test_filename)
        else:
            assert url.startswith("/static/uploads")
            print(f"ℹ️ Fallback Local OK: {url}")
            # Limpeza local
            local_path = f".{url}" # /static/uploads -> ./static/uploads
            if os.path.exists(local_path):
                os.remove(local_path)
                
    except Exception as e:
        pytest.fail(f"Upload falhou: {e}")

if __name__ == "__main__":
    test_s3_connection_and_upload()
