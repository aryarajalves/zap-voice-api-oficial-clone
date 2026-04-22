import os

path = r'frontend/src/pages/Integrations.jsx'

if not os.path.exists(path):
    print(f"Error: {path} not found")
    exit(1)

print(f"Fixing encoding for {path}...")
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

replacements = {
    'Ã§Ã£o': 'ção',
    'Ã§Ãµes': 'ções',
    'Ã¡': 'á',
    'Ã©': 'é',
    'Ã­': 'í',
    'Ã³': 'ó',
    'Ãº': 'ú',
    'Ã£': 'ã',
    'Ãµ': 'õ',
    'Ã¢': 'â',
    'Ãª': 'ê',
    'Ã´': 'ô',
    'Ã§': 'ç',
    'Ã ': 'à', # Often used for 'à' or start of other chars, be careful
    'Ã€': 'À',
    'Ã\x81': 'Á',
    'Ã\x89': 'É',
    'Ã\x8d': 'Í',
    'Ã\x93': 'Ó',
    'Ã\x9a': 'Ú',
    # Specific sequences seen in screenshot
    'CONCLUÃ\xadDO': 'CONCLUÍDO',
    'AÃ§Ãµes': 'Ações',
    'ExecuÃ§Ã£o': 'Execução',
    'DestinatÃ¡rio': 'Destinatário',
    'HistÃ³rico': 'Histórico',
    'SessÃ£o': 'Sessão',
    'GrÃ¡tis': 'Grátis',
    'corrupÃ§Ã£o': 'corrupção',
    'ExclusÃ£o': 'Exclusão',
    'aÃ§Ã£o': 'ação',
    'irrevogÃ¡vel': 'irrevogável',
    'ConfiguraÃ§Ã£o': 'Configuração',
    'AtenÃ§Ã£o': 'Atenção',
    'perÃ­odo': 'período',
    'vÃ­rgula': 'vírgula',
}

# Apply replacements in order (more specific first)
for old, new in replacements.items():
    content = content.replace(old, new)

# Special case for uppercase CONCLUÍDO which might be different bytes
content = content.replace('CONCLUÃ\xadDO', 'CONCLUÍDO')
content = content.replace('CONCLUÃ\x8dDO', 'CONCLUÍDO')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Encoding fix complete.")
