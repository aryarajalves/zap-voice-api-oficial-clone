
import sys

print("DEBUG START")
try:
    from database import async_session
    print("DB SUCCESS")
except Exception as e:
    print(f"DB ERROR: {e}")
    sys.exit(1)
try:
    from core.security import get_password_hash
    print("SEC SUCCESS")
except Exception as e:
    print(f"SEC ERROR: {e}")
