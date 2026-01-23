import os
from urllib.parse import unquote

def resolve_path(url):
    print(f"Testing URL: {url}")
    file_path = None
    if "static/uploads" in url:
        try:
            # Pega tudo depois de /static/ (ex: uploads/arquivo.mp3)
            file_name_part = url.split("/static/")[1] 
            file_name_part = unquote(file_name_part)
            
            # Resolução robusta de caminho absoluto
            # Simulating backend/chatwoot_client.py location
            base_path = os.getcwd() 
            # In actual app, base_path is backend dir
            
            print(f"Base path: {base_path}")

            # Constrói caminho completo: backend/static/uploads/arquivo.mp3
            # Use split('/') to ensure cross-platform join if url has /
            parts = file_name_part.split('/')
            file_path = os.path.join(base_path, "static", *parts)
            file_path = os.path.normpath(file_path)
            
            print(f"Resolved path: {file_path}")
            print(f"File exists: {os.path.exists(file_path)}")
        except Exception as e:
            print(f"Error parsing local URL: {e}")
            
    # Fallback logic
    if not file_path or not os.path.exists(file_path):
         try:
             filename = url.split("/")[-1]
             base_path = os.getcwd() # In backend dir
             potential_path = os.path.join(base_path, "static", "uploads", filename)
             print(f"Trying fallback path: {potential_path}")
             if os.path.exists(potential_path):
                 print(f"DEBUG: Found file using fallback filename match: {potential_path}")
                 file_path = potential_path
         except:
             pass
             
    return file_path

# Create dummy file for testing
os.makedirs("static/uploads", exist_ok=True)
with open("static/uploads/test_video.mp4", "w") as f:
    f.write("dummy content")

# Test cases
urls = [
    "http://localhost:8000/static/uploads/test_video.mp4",
    "http://127.0.0.1:8000/static/uploads/test_video.mp4",
    "https://ngrok-url.com/static/uploads/test_video.mp4"
]

for u in urls:
    print("-" * 20)
    resolve_path(u)
