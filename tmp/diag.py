
target_file = r'c:\Users\aryar\.gemini\antigravity\scratch\Projetos Serios\Projeto - ZapVoice no Chatwoot\backend\models.py'
with open(target_file, 'rb') as f:
    content = f.read()

# Mostra as linhas 320-330 em modo binário/representação
lines = content.splitlines()
for i in range(320, 330):
    if i < len(lines):
        print(f"{i}: {repr(lines[i])}")
