
import os

target_file = r'c:\Users\aryar\.gemini\antigravity\scratch\Projetos Serios\Projeto - ZapVoice no Chatwoot\backend\models.py'

with open(target_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    new_lines.append(line)
    if 'delay_minutes' in line and 'Column' in line:
        if 'delay_seconds' not in "".join(lines): # avoid double add
             indent = line[:len(line) - len(line.lstrip())]
             new_lines.append(f"{indent}delay_seconds = Column(Integer, default=0) # Delay em segundos\n")

with open(target_file, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print("Done")
