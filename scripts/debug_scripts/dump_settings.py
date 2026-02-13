import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from config_loader import get_settings

settings = get_settings(client_id=1)
print(f"CHATWOOT_API_URL: {settings.get('CHATWOOT_API_URL')}")
print(f"CHATWOOT_ACCOUNT_ID: {settings.get('CHATWOOT_ACCOUNT_ID')}")
print(f"CHATWOOT_SELECTED_INBOX_ID: {settings.get('CHATWOOT_SELECTED_INBOX_ID')}")
