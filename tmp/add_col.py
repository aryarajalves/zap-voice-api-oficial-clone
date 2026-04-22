
import sys

with open(r'c:\Users\aryar\..gemini\antigravity\scratch\Projetos Serios\Projeto - ZapVoice no Chatwoot\backend\models.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    new_lines.append(line)
    if 'delay_minutes = Column(Integer, default=0)' in line:
        if 'delay_seconds' not in line: # avoid double add
             indent = line[:line.find('delay_minutes')]
             new_lines.append(f"{indent}delay_seconds = Column(Integer, default=0) # Delay em segundos\n")

with open(r'c:\Users\aryar\..gemini\antigravity\scratch\Projetos Serios\Projeto - ZapVoice no Chatwoot\backend\models.py', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print("Done")
