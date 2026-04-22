import os
import re

path = r'frontend/src/pages/Integrations.jsx'

if not os.path.exists(path):
    print(f"Error: {path} not found")
    exit(1)

print(f"Deep fixing encoding for {path}...")
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Using hex escapes to avoid syntax errors with malformed characters
ufffd = '\ufffd'

# 1. Broad replacements for common patterns
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
    'Ã€': 'À',
    'âš\x00ï¸': '⚠️',
    'âš\xa0ï¸': '⚠️',
    'âœ\x05': '✅',
    'Ã\x81': 'Á',
    'Ã\x89': 'É',
    'Ã\x8d': 'Í',
    'Ã\x93': 'Ó',
    'Ã\x9a': 'Ú',
    'invǟlido': 'inválido',
    'usuǟrio': 'usuário',
}

for old, new in replacements.items():
    content = content.replace(old, new)

# 2. Fix patterns with \ufffd (replacement char)
ufffd_fixes = {
    'Integra' + ufffd + 'o': 'Integração',
    'exclu' + ufffd + 'da': 'excluída',
    'valida' + ufffd + 'o': 'validação',
    'cr' + ufffd + 'tica': 'crítica',
    'cr' + ufffd + 'tico': 'crítico',
    'comunica' + ufffd + 'o': 'comunicação',
    'sincroniza' + ufffd + 'o': 'sincronização',
    'Inv' + ufffd + 'lido': 'Inválido',
    'Requisi' + ufffd + 'o': 'Requisição',
    'Sincroniza' + ufffd + 'o': 'Sincronização',
    'usu' + ufffd + 'rio': 'usuário',
    'per' + ufffd + 'do': 'período',
    'exclu' + ufffd + 'o': 'exclusão',
    'Aten' + ufffd + 'o': 'Atenção',
    'exclus' + ufffd + 'o': 'exclusão',
    'n' + ufffd + 'o': 'não',
    'poss' + ufffd + 'vel': 'possível',
    'hist' + ufffd + 'rico': 'histórico',
    'Cart' + ufffd + 'o': 'Cartão',
    'Jo' + ufffd + 'o': 'João',
}

for old, new in ufffd_fixes.items():
    content = content.replace(old, new)

# 3. Last resort regex for common Brazilian words
content = content.replace('DestinatÃ¡rio', 'Destinatário')
content = content.replace('CONCLUÃ\xadDO', 'CONCLUÍDO')
content = content.replace('CONCLUÃ°DO', 'CONCLUÍDO')

# Final specific strings fix
specific_fixes = {
    'AÃ§Ãµes': 'Ações',
    'ExecuÃ§Ã£o': 'Execução',
    'SessÃ£o': 'Sessão',
    'GrÃ¡tis': 'Grátis',
    'Ã¡rio': 'ário',
    'HistÃ³rico': 'Histórico',
    'Confirmar ExclusÃ£o': 'Confirmar Exclusão',
    'AtenÃ§Ã£o': 'Atenção',
    'ConfirmaÃ§Ã£o': 'Confirmação',
    'NÃ£o': 'Não',
    'hÃ¡': 'há'
}

for old, new in specific_fixes.items():
    content = content.replace(old, new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Deep Encoding fix and string restoration complete for {path}.")
