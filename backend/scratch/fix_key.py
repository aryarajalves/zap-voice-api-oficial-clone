import sys

target_file = r'c:\Users\aryar\.gemini\antigravity\scratch\Projetos Serios\Projeto - ZapVoice no Chatwoot\backend\worker.py'

with open(target_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the key format from {1} to {{1}}
fixed_content = content.replace("c.get('{1}')", "c.get('{{1}}')")

with open(target_file, 'w', encoding='utf-8') as f:
    f.write(fixed_content)

print("Key format fixed to {{1}}.")
