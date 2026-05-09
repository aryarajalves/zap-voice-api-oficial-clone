import os
from sqlalchemy import create_engine, inspect, text
from database import SQLALCHEMY_DATABASE_URL
from models import Base
import models

def generate_sql():
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    
    sql_commands = []
    
    for table_name, table in Base.metadata.tables.items():
        if table_name not in existing_tables:
            # Table creation SQL is complex via reflection, but create_all handles it.
            # However, user wants SQL.
            sql_commands.append(f"-- Table {table_name} is missing. Please run the full creation script.")
            continue
            
        db_columns = {c['name']: c for c in inspector.get_columns(table_name)}
        
        for column in table.columns:
            if column.name not in db_columns:
                col_type = column.type.compile(engine.dialect)
                
                # Default logic
                default_clause = ""
                if column.server_default is not None:
                    try:
                        default_clause = f" DEFAULT {column.server_default.arg.text}"
                    except:
                        pass
                elif column.default is not None and not callable(column.default.arg):
                    val = column.default.arg
                    if isinstance(val, bool):
                        val = 'TRUE' if val else 'FALSE'
                    elif isinstance(val, str):
                        val = f"'{val}'"
                    default_clause = f" DEFAULT {val}"
                
                sql = f'ALTER TABLE "{table_name}" ADD COLUMN IF NOT EXISTS "{column.name}" {col_type}{default_clause};'
                sql_commands.append(sql)

    if not sql_commands:
        print("-- No missing columns found.")
    else:
        print("\n".join(sql_commands))

if __name__ == "__main__":
    generate_sql()
