#!/usr/bin/env python3
"""
Script para criar o banco de dados PostgreSQL automaticamente
"""
import os
from sqlalchemy import create_engine, text
from sqlalchemy.exc import ProgrammingError

def create_database_if_not_exists():
    """Cria o banco de dados 'zapvoice' se ele não existir"""
    
    # Pegar a DATABASE_URL do ambiente
    database_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/zapvoice")
    
    # Extrair informações da connection string
    # Formato: postgresql://user:password@host:port/database
    parts = database_url.replace("postgresql://", "").split("@")
    user_pass = parts[0].split(":")
    host_port_db = parts[1].split("/")
    host_port = host_port_db[0].split(":")
    
    user = user_pass[0]
    password = user_pass[1] if len(user_pass) > 1 else ""
    host = host_port[0]
    port = host_port[1] if len(host_port) > 1 else "5432"
    database = host_port_db[1] if len(host_port_db) > 1 else "zapvoice"
    
    # Conectar no banco 'postgres' (default) para criar o banco 'zapvoice'
    admin_url = f"postgresql://{user}:{password}@{host}:{port}/postgres"
    
    try:
        print(f"🔍 Verificando se o banco de dados '{database}' existe...", flush=True)
        
        # Engine para o banco admin
        admin_engine = create_engine(admin_url, isolation_level="AUTOCOMMIT", connect_args={"connect_timeout": 5})
        
        with admin_engine.connect() as conn:
            # Verificar se o banco existe
            result = conn.execute(
                text(f"SELECT 1 FROM pg_database WHERE datname = '{database}'")
            )
            exists = result.fetchone()
            
            if not exists:
                print(f"❌ Banco '{database}' não encontrado. Criando...", flush=True)
                conn.execute(text(f'CREATE DATABASE "{database}"'))
                print(f"✅ Banco de dados '{database}' criado com sucesso!", flush=True)
            else:
                print(f"✅ Banco de dados '{database}' já existe!", flush=True)
        
        admin_engine.dispose()
        return True
        
    except Exception as e:
        print(f"❌ Erro ao criar banco de dados: {e}", flush=True)
        return False

if __name__ == "__main__":
    create_database_if_not_exists()
