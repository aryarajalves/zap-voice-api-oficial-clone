import os
# Mock env vars
os.environ["VITE_API_URL"] = "https://zapjordsandrieli.aryaraj.shop/api"
os.environ["S3_ENDPOINT_URL"] = "" # Disable S3

from storage import StorageClient

def test_local_url():
    storage = StorageClient()
    url = storage.get_public_url("test_image.jpg")
    print(f"URL Gerada (Local): {url}")
    expected = "https://zapjordsandrieli.aryaraj.shop/static/uploads/test_image.jpg"
    if url == expected:
        print("✅ Teste aprovado!")
    else:
        print(f"❌ Teste falhou! Esperado: {expected}")

if __name__ == "__main__":
    test_local_url()
