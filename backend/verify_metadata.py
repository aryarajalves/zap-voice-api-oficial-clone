
import sys
import os
sys.path.append(os.getcwd())
os.chdir('backend')
sys.path.append(os.getcwd())

from database import Base
import models

print("Tables in Base.metadata:")
for table in Base.metadata.tables.keys():
    print(f" - {table}")

if "users" in Base.metadata.tables:
    print("SUCCESS: users table found in metadata")
else:
    print("FAILURE: users table NOT found in metadata")
