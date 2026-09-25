import os
import asyncio
from core.logger import logger

async def seed_super_admin():
    """Garante que o Super Admin exista conforme o .env com lógica de retry"""
    from database import SessionLocal
    from models import User
    from core.security import get_password_hash, verify_password
    from sqlalchemy.exc import OperationalError
    
    email = os.getenv("SUPER_ADMIN_EMAIL")
    password = os.getenv("SUPER_ADMIN_PASSWORD")
    
    # Limpar aspas que podem vir do Portainer/Docker e espaços em branco
    if email: email = email.strip('"').strip("'").strip()
    if password: password = password.strip('"').strip("'").strip()
    
    if not email or not password:
        logger.warning("⚠️ SUPER_ADMIN_EMAIL ou SUPER_ADMIN_PASSWORD não configurados no .env")
        return

    logger.info(f"🔑 Verificando configuração de Super Admin para: {email}")
    
    max_retries = 5
    retry_delay = 5
    
    for attempt in range(max_retries):
        db = SessionLocal()
        try:
            # 1. Remover outros admins legados e outros super_admins que não sejam o atual do ENV
            old_admins = db.query(User).filter(User.role == "super_admin", User.email != email).all()
            for old_adm in old_admins:
                logger.info(f"🗑️ Removendo super admin legado/antigo: {old_adm.email}")
                db.delete(old_adm)

            if email != "admin@admin.com":
                old_admin = db.query(User).filter(User.email == "admin@admin.com").first()
                if old_admin:
                    logger.info("🗑️ Removendo admin legado (admin@admin.com)")
                    db.delete(old_admin)
            
            db.commit()

            # 2. Garantir o admin atual e forçar sincronização de senha se necessário
            user = db.query(User).filter(User.email == email).first()
            
            if user:
                # Verifica se a senha atual do banco bate com a do ENV
                if not verify_password(password, user.hashed_password):
                    logger.info(f"🔑 Senha do Super Admin ({email}) desalinhada com o ENV. Atualizando...")
                    user.hashed_password = get_password_hash(password)
                else:
                    logger.info(f"✨ Super Admin {email} já está com a senha correta no banco.")
                
                user.role = "super_admin"
                user.is_active = True
                user.full_name = "Super Admin"
            else:
                logger.info(f"🚀 Criando novo Super Admin: {email}")
                hashed_password = get_password_hash(password)
                new_user = User(
                    email=email,
                    hashed_password=hashed_password,
                    role="super_admin",
                    full_name="Super Admin",
                    is_active=True
                )
                db.add(new_user)
                
            db.commit()
            logger.info(f"✅ Sincronização de Super Admin ({email}) concluída com sucesso!")
            break  # Sucesso — sai do loop de tentativas
            
        except OperationalError as e:
            logger.warning(f"⏳ Banco de dados ainda não está pronto (Tentativa {attempt + 1}/{max_retries}). Aguardando {retry_delay}s...")
            if attempt == max_retries - 1:
                logger.error(f"❌ Não foi possível conectar ao banco após {max_retries} tentativas: {e}")
                raise
            await asyncio.sleep(retry_delay)
        except Exception as e:
            logger.error(f"❌ Erro inesperado ao realizar seed do Super Admin: {e}")
            db.rollback()
            raise
        finally:
            db.close()
