from database import SessionLocal
import models

db = SessionLocal()

template_name = "carrinho_abandonado"
target_client_id = 1

print(f"Searching for webhook mapping with template_name='{template_name}', client_id={target_client_id}")

q = db.query(models.WebhookEventMapping).join(
    models.WebhookIntegration,
    models.WebhookEventMapping.integration_id == models.WebhookIntegration.id
).filter(
    models.WebhookIntegration.client_id == target_client_id,
    (models.WebhookEventMapping.template_name == template_name) | 
    (models.WebhookEventMapping.followup_template_name == template_name)
)

print("\n--- SQL Query ---")
print(q)

res = q.first()
if res:
    print(f"\nFOUND: Mapping ID={res.id}, Event={res.event_type}, Template={res.template_name}")
else:
    print("\nNOT FOUND!")

print("\nAll mappings in DB for reference:")
all_m = db.query(models.WebhookEventMapping).all()
for m in all_m:
    print(f"ID={m.id}, IntegrationID={m.integration_id}, Event={m.event_type}, Template='{m.template_name}' (type={type(m.template_name)}), Followup='{m.followup_template_name}'")

db.close()
