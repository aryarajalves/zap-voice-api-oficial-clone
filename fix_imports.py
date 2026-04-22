
import os

file_path = 'backend/worker.py'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 1. Add 'or_' to the top imports if not there
has_or = False
for line in lines[:50]:
    if 'from sqlalchemy import' in line and 'or_' in line:
        has_or = True
        break

if not has_or:
    # Find a good place to insert (after other sqlalchemy imports)
    inserted = False
    for i, line in enumerate(lines):
        if 'from sqlalchemy import' in line:
            lines.insert(i+1, 'from sqlalchemy import or_\n')
            inserted = True
            break
    if not inserted:
        lines.insert(0, 'from sqlalchemy import or_\n')

# 2. Remove the local import that caused the issue
new_lines = []
for line in lines:
    if 'from sqlalchemy import or_' in line and '                                             from sqlalchemy import or_' in line:
        continue # Skip the indented one
    new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Done")
