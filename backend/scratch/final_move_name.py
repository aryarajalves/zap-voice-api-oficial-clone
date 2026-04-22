import sys

target_file = r'c:\Users\aryar\.gemini\antigravity\scratch\Projetos Serios\Projeto - ZapVoice no Chatwoot\backend\worker.py'

with open(target_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Correct indentation for the target line (937): 49 spaces
# Actually, let's verify line 937 indentation.
# Line 937: '                            if status in ['delivered', 'read'] and trigger:'
# Leading spaces: 28 approx. Let's count.

def get_indent(line):
    return len(line) - len(line.lstrip())

# Find the target status block
status_idx = -1
for i, line in enumerate(lines):
    # Match the specific "External Event" comment which is unique
    if "# NEW: External Event Publishing (RabbitMQ)" in line:
        status_idx = i + 1
        break

if status_idx == -1:
    print("FAILED to find status check block")
    sys.exit(1)

base_indent = " " * get_indent(lines[status_idx])

# Logic to resolve name
name_logic = f"""{base_indent}# RESOLVER NOME E TELEFONE (Especialmente para disparos de massa)
{base_indent}phone_to_notify = message_record.phone_number
{base_indent}contact_name = trigger.contact_name
{base_indent}if not contact_name and trigger.contacts_list:
{base_indent}    try:
{base_indent}        clean_p = "".join(filter(str.isdigit, str(phone_to_notify)))
{base_indent}        for c in (trigger.contacts_list or []):
{base_indent}            val = c if isinstance(c, str) else (c.get('phone') or c.get('telefone') or '')
{base_indent}            c_phone = "".join(filter(str.isdigit, str(val)))
{base_indent}            if c_phone == clean_p or (len(c_phone) >= 8 and len(clean_p) >= 8 and c_phone[-8:] == clean_p[-8:]):
{base_indent}                if isinstance(c, dict):
{base_indent}                    contact_name = (
{base_indent}                        c.get('{{{{1}}}}') or 
{base_indent}                        c.get('1') or 
{base_indent}                        c.get('nome') or 
{base_indent}                        c.get('name') or 
{base_indent}                        c.get('full_name') or 
{base_indent}                        c.get('contact_name') or ""
{base_indent}                    )
{base_indent}                break
{base_indent}    except Exception as e_name:
{base_indent}        logger.warning(f"⚠️ [MEMORY] Erro ao buscar nome na lista: {{e_name}}")

"""

# Insert logic at status_idx + 1 (inside the 'if status in...' block)
lines.insert(status_idx + 1, name_logic)

# REMOVE OLD LOGIC (which was around 969+)
# Let's search for it.
start_old = -1
end_old = -1
for i, line in enumerate(lines):
    if "# RESOLVER NOME E TELEFONE" in line and i > status_idx + 20:
        start_old = i
    if "from services.ai_memory import notify_agent_memory_webhook" in line and i > status_idx + 20:
        end_old = i
        break

if start_old != -1 and end_old != -1:
    print(f"Removing old logic from {start_old} to {end_old}")
    del lines[start_old:end_old]

with open(target_file, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("SUCCESS: Name resolution moved to top.")
