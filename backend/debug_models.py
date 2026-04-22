
import sys
import os
sys.path.append('backend')
from database import Base
import models
# Force all models to be loaded
import routers.auth
import routers.triggers

print("Classes in Base.metadata:")
for table_name in Base.metadata.tables.keys():
    print(f" - {table_name}")
