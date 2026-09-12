from database import SessionLocal
from sqlalchemy import text
db = SessionLocal()
sql = """
SELECT id, name, tags,
       concat(',', replace(coalesce(tags, ''), ', ', ','), ',') as full_tag,
       concat(',', replace(coalesce(tags, ''), ', ', ','), ',') ILIKE '%,aryaraj,%' as has_aryaraj,
       concat(',', replace(coalesce(tags, ''), ', ', ','), ',') ILIKE '%,aryaraj_hokage,%' as has_aryaraj_hokage
FROM webhook_leads WHERE id in (277488, 277478)
"""
rows = db.execute(text(sql)).fetchall()
for r in rows:
    print(dict(r._mapping))
