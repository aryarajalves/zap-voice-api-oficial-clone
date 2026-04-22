import os

path = r'frontend/src/pages/Integrations.jsx'

if not os.path.exists(path):
    print(f"Error: {path} not found")
    exit(1)

print(f"Reading {path}...")
with open(path, 'rb') as f:
    content = f.read()

original_size = len(content)
print(f"Original size: {original_size} bytes")

# 1. Remove null bytes
clean_content = content.replace(b'\x00', b'')

# 2. Fix common encoding artifacts (UTF-8 bytes misread as something else)
# This is a bit risky but we can target the most obvious ones
fixes = [
    (b'\xc3\xa3', 'ã'.encode('utf-8')),
    (b'\xc3\xa7', 'ç'.encode('utf-8')),
    (b'\xc3\xa1', 'á'.encode('utf-8')),
    (b'\xc3\xa9', 'é'.encode('utf-8')),
    (b'\xc3\xad', 'í'.encode('utf-8')),
    (b'\xc3\xb3', 'ó'.encode('utf-8')),
    (b'\xc3\xba', 'ú'.encode('utf-8')),
    (b'\xc3\xb5', 'õ'.encode('utf-8')),
    (b'\xc3\xaa', 'ê'.encode('utf-8')),
    (b'\xc3\xb4', 'ô'.encode('utf-8')),
    (b'\xc3\x80', 'À'.encode('utf-8')),
    (b'\xc3\x81', 'Á'.encode('utf-8')),
    (b'\xc3\x89', 'É'.encode('utf-8')),
    (b'\xc3\x8d', 'Í'.encode('utf-8')),
    (b'\xc3\x93', 'Ó'.encode('utf-8')),
    (b'\xc3\x9a', 'Ú'.encode('utf-8')),
    (b'\xc3\x87', 'Ç'.encode('utf-8')),
]

for old, new in fixes:
    clean_content = clean_content.replace(old, new)

new_size = len(clean_content)
print(f"New size: {new_size} bytes")
print(f"Removed/Fixed: {original_size - new_size} bytes")

with open(path, 'wb') as f:
    f.write(clean_content)

print("Cleanup complete.")
