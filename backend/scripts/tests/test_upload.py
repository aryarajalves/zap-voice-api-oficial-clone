
import requests
import os

API_URL = "http://localhost:8000"

def test_upload():
    # Test with a dummy image
    with open("test.png", "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n\x2e\xe4\x00\x00\x00\x00IEND\xaeB`\x82")
    
    with open("test.png", "rb") as f:
        files = {'file': ('test.png', f, 'image/png')}
        # Note: We need a token if there is authentication
        # But for now let's see if we get a 401 or something else
        try:
            r = requests.post(f"{API_URL}/upload", files=files)
            print(f"Status: {r.status_code}")
            print(f"Body: {r.text}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    test_upload()
