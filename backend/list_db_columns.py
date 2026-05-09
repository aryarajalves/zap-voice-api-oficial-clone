import os
from sqlalchemy import create_engine, inspect
from database import SQLALCHEMY_DATABASE_URL

def list_all_columns():
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    inspector = inspect(engine)
    for table_name in inspector.get_table_names():
        columns = [c['name'] for c in inspector.get_columns(table_name)]
        print(f"Table: {table_name}")
        print(f"Columns: {columns}\n")

if __name__ == "__main__":
    list_all_columns()
