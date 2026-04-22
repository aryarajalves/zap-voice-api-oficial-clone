
import sys
import os

target_file = r'c:\Users\aryar\..gemini\antigravity\scratch\Projetos Serios\Projeto - ZapVoice no Chatwoot\backend\models.py'
# Se o path com dois pontos falhar, tentamos o normal
if not os.path.exists(target_file):
    target_file = r'c:\Users\aryar\.gemini\antigravity\scratch\Projetos Serios\Projeto - ZapVoice no Chatwoot\backend\models.py'

print(f"Targeting: {target_file}")

with open(target_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
found = False
for line in lines:
    new_lines.append(line)
    if 'delay_minutes = Column(Integer, default=0)' in line:
        if 'delay_seconds' not in "".join(lines): # avoid double add
             indent = line[:line.find('delay_minutes')]
             new_lines.append(f"{indent}delay_seconds = Column(Integer, default=0) # Delay em segundos\n")
             found = True

if found:
    with open(target_file, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print("Done")
else:
    print("Not found or already added")
