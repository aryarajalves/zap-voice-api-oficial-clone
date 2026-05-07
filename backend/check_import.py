import sys
import os

# Add backend to path
sys.path.append('c:/Users/aryar/.gemini/antigravity/scratch/Projetos Serios/Projeto - ZapVoice no Chatwoot/backend')

try:
    from routers.webhooks_public import process_webhook_automation
    print(f"Import successful: {process_webhook_automation}")
except Exception as e:
    print(f"Import failed: {e}")
    import traceback
    traceback.print_exc()
