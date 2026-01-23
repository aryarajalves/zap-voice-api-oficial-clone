import time
import urllib.request
import sys

url = "http://127.0.0.1:8000/docs"
print(f"Checking {url}...")

for i in range(10):
    try:
        with urllib.request.urlopen(url) as response:
            print(f"Success! Status: {response.status}")
            sys.exit(0)
    except Exception as e:
        print(f"Attempt {i+1}: Failed - {e}")
        time.sleep(1)

print("Could not connect after 10 attempts.")
sys.exit(1)
