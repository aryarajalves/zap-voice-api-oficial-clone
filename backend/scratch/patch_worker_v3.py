import sys

target_file = r'c:\Users\aryar\.gemini\antigravity\scratch\Projetos Serios\Projeto - ZapVoice no Chatwoot\backend\worker.py'

with open(target_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Correct indentation and the {{1}} key
base_indent = "                                                  "

# Logic with correct string literal (not f-string for the dictionary access part)
new_logic = f"""{base_indent}# Se for em massa e o nome estiver vazio, tentamos buscar na lista
{base_indent}if not contact_name and trigger.contacts_list:
{base_indent}    try:
{base_indent}        clean_p = "".join(filter(str.isdigit, str(phone_to_notify)))
{base_indent}        if trigger.contacts_list and len(trigger.contacts_list) > 0:
{base_indent}            sample = trigger.contacts_list[0]
{base_indent}            import logging
{base_indent}            logger_dbg = logging.getLogger("Worker")
{base_indent}            logger_dbg.info(f"🔍 [MEMORIA DEBUG] Buscando {{clean_p}}. Amostra keys: {{list(sample.keys()) if isinstance(sample, dict) else 'not dict'}}")

{base_indent}        for c in (trigger.contacts_list or []):
{base_indent}            val = c if isinstance(c, str) else (c.get('phone') or c.get('telefone') or '')
{base_indent}            c_phone = "".join(filter(str.isdigit, str(val)))
{base_indent}            
{base_indent}            # Comparação robusta: match exato ou sufixo comum de 8 dígitos
{base_indent}            if c_phone == clean_p or (len(c_phone) >= 8 and len(clean_p) >= 8 and c_phone[-8:] == clean_p[-8:]):
{base_indent}                if isinstance(c, dict):
{base_indent}                    # Prioridade absoluta para variáveis de template {{{{1}}}}, 1, then names
{base_indent}                    contact_name = (
{base_indent}                        c.get('{{1}}') or 
{base_indent}                        c.get('1') or 
{base_indent}                        c.get('nome') or 
{base_indent}                        c.get('name') or 
{base_indent}                        c.get('full_name') or 
{base_indent}                        c.get('contact_name') or ""
{base_indent}                    )
{base_indent}                break
{base_indent}    except Exception as e_name:
{base_indent}        import logging
{base_indent}        logging.getLogger("Worker").warning(f"⚠️ [MEMORY] Erro ao buscar nome na lista: {{e_name}}")
"""

# Splice it in correctly. We know the previous block started at 972 (0-indexed) 
# and ended around 1004 (or slightly more/less now).
# Actually, I'll search for the line starting with "# Se for em massa"
start_idx = -1
end_idx = -1
for i, line in enumerate(lines):
    if "# Se for em massa" in line and i > 900:
        start_idx = i
    if "if template_body and trigger.template_name:" in line and i > 950:
        end_idx = i
        break

if start_idx != -1 and end_idx != -1:
    final_lines = lines[:start_idx] + [new_logic] + lines[end_idx:]
    with open(target_file, 'w', encoding='utf-8') as f:
        f.writelines(final_lines)
    print(f"Replacement successful. Block {start_idx} to {end_idx} updated.")
else:
    print(f"FAILED to find block markers: start={start_idx}, end={end_idx}")
