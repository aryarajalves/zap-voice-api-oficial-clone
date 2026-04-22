import sys

target_file = r'c:\Users\aryar\.gemini\antigravity\scratch\Projetos Serios\Projeto - ZapVoice no Chatwoot\backend\worker.py'

with open(target_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Indentacao base: 49 espacos
base_indent = "                                                 "

# We want to move the name resolution to before any deliveries/notes are processed.
# Find the start of the status update loop or just before deliveries.
# Actually, I'll find where 'message_record' is resolved for 'delivered' status.

start_search_idx = -1
for i, line in enumerate(lines):
    if "if status in ['delivered', 'read']:" in line:
        start_search_idx = i
        break

if start_search_idx == -1:
    print("FAILED to find status check block")
    sys.exit(1)

# Logic to resolve name once per message status update
name_resolution_logic = f"""{base_indent}    # RESOLVER NOME E TELEFONE (Especialmente para disparos de massa)
{base_indent}    phone_to_notify = message_record.phone_number
{base_indent}    contact_name = trigger.contact_name
{base_indent}    
{base_indent}    # Se for em massa e o nome estiver vazio, tentamos buscar na lista
{base_indent}    if not contact_name and trigger.contacts_list:
{base_indent}        try:
{base_indent}            clean_p = "".join(filter(str.isdigit, str(phone_to_notify)))
{base_indent}            for c in (trigger.contacts_list or []):
{base_indent}                val = c if isinstance(c, str) else (c.get('phone') or c.get('telefone') or '')
{base_indent}                c_phone = "".join(filter(str.isdigit, str(val)))
{base_indent}                if c_phone == clean_p or (len(c_phone) >= 8 and len(clean_p) >= 8 and c_phone[-8:] == clean_p[-8:]):
{base_indent}                    if isinstance(c, dict):
{base_indent}                        contact_name = (
{base_indent}                            c.get('{{{{1}}}}') or 
{base_indent}                            c.get('1') or 
{base_indent}                            c.get('nome') or 
{base_indent}                            c.get('name') or 
{base_indent}                            c.get('full_name') or 
{base_indent}                            c.get('contact_name') or ""
{base_indent}                        )
{base_indent}                    break
{base_indent}        except Exception as e_name:
{base_indent}            logger.warning(f"⚠️ [MEMORY] Erro ao buscar nome na lista: {{e_name}}")

"""

# Now we need to remove the OLD resolution logic which is inside the memory webhook block.
# And also handle the private note rendering using this resolved name.

# Let's rebuild the status loop.
# It's safer to use search and replace for the blocks.

# Clean up the OLD resolution block in worker.py
clean_content = "".join(lines)

# Find the block I added previously
old_block_pattern = "# Se for em massa e o nome estiver vazio"
# I'll replace it with empty since I'm moving it.

# Actually, I'll just write a script that does specific replacements.
# 1. Insert resolution at the top of 'if status in ['delivered', 'read']:'
# 2. Use 'contact_name' to render private note content.

# 1. Insert name resolution
lines.insert(start_search_idx + 1, name_resolution_logic)

with open(target_file, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Name resolution moved to top of status loop.")
