import sys

target_file = r'c:\Users\aryar\.gemini\antigravity\scratch\Projetos Serios\Projeto - ZapVoice no Chatwoot\backend\worker.py'

with open(target_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Look for the specific line 981 (1-indexed, so 980 in 0-indexed)
# Wait, let me verify the content of line 981 first.
print(f"DEBUG line 981: '{lines[980]}'")

new_logic = """                                                                  # Busca inteligente por nome (prioridade para chaves conhecidas)
                                                                  if isinstance(c, dict):
                                                                      contact_name = (
                                                                          c.get('name') or 
                                                                          c.get('nome') or 
                                                                          c.get('{{1}}') or 
                                                                          c.get('1') or 
                                                                          c.get('full_name') or 
                                                                          c.get('contato') or
                                                                          c.get('cliente') or ""
                                                                      )
"""

# Replace line 981 (980)
lines[980] = new_logic

with open(target_file, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Replacement successful.")
