import os
import sys
import uuid
import random
import json
from datetime import datetime, timedelta, timezone

# Add backend root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from database import SessionLocal
import models
from core.security import get_password_hash

FIRST_NAMES = [
    "Lucas", "Mariana", "Gabriel", "Beatriz", "Felipe", "Camila", "Rodrigo", "Juliana",
    "Matheus", "Larissa", "Thiago", "Amanda", "Bruno", "Letícia", "Diego", "Fernanda",
    "Gustavo", "Carolina", "Leonardo", "Patricia", "Rafael", "Natália", "Eduardo", "Vanessa",
    "Guilherme", "Renata", "Vinícius", "Aline", "Marcelo", "Bianca", "Alexandre", "Priscila",
    "Daniel", "Sabrina", "Caio", "Jéssica", "Arthur", "Bruna", "Igor", "Talita"
]

LAST_NAMES = [
    "Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", "Pereira",
    "Lima", "Gomes", "Costa", "Ribeiro", "Martins", "Carvalho", "Almeida", "Lopes",
    "Soares", "Fernandes", "Vieira", "Barbosa", "Rocha", "Dias", "Nascimento", "Andrade",
    "Moreira", "Nunes", "Marques", "Machado", "Mendes", "Freitas", "Cardoso", "Ramos"
]

SAMPLE_CLIENT_NAMES = [
    "SST", "Sales Force Brasil", "Acme Enterprise", "TechCorp Soluções", "Nexus Digital",
    "Titan Seguros", "Vanguard Financeira", "Inovare Saúde", "Omni Retail", "Alpha Logística",
    "Beta Consultoria", "Delta Vendas", "Prime Motors", "Avança E-commerce", "Conecta Imóveis"
]

def seed():
    db = SessionLocal()
    try:
        print("--- INICIANDO SEED DE 1000 USUÁRIOS E 1500 CONVITES ---")
        
        # 1. Garantir Clientes Diversos
        existing_clients = db.query(models.Client).all()
        existing_names = {c.name for c in existing_clients}
        
        clients_pool = list(existing_clients)
        for cname in SAMPLE_CLIENT_NAMES:
            if cname not in existing_names:
                new_client = models.Client(name=cname, is_active=True)
                db.add(new_client)
                clients_pool.append(new_client)
        db.commit()
        
        # Recarregar lista completa de clientes
        clients_pool = db.query(models.Client).all()
        print(f"Total de Clientes no Banco: {len(clients_pool)}")

        # Obter super admin existente para autoria dos convites
        super_admin = db.query(models.User).filter(models.User.role == 'super_admin').first()
        super_admin_id = super_admin.id if super_admin else 1

        now = datetime.now(timezone.utc)
        precomputed_hash = get_password_hash("123456")

        # 2. Criar 1000 Novos Usuários
        print("Gerando 1000 novos usuários...")
        users_to_add = []
        user_roles_pool = ["admin"] * 25 + ["vendedor"] * 55 + ["user"] * 20
        
        # Verificar o maior ID de mock existente para evitar colisão de emails
        base_timestamp = now - timedelta(days=180)
        
        for i in range(1, 1001):
            fn = random.choice(FIRST_NAMES)
            ln1 = random.choice(LAST_NAMES)
            ln2 = random.choice(LAST_NAMES)
            full_name = f"{fn} {ln1} {ln2}"
            email = f"mock.user.{i}_{uuid.uuid4().hex[:6]}@empresa.com.br"
            role = random.choice(user_roles_pool)
            seller_weight = random.randint(1, 5) if role == 'vendedor' else 1
            is_active = random.random() < 0.88  # 88% ativos, 12% inativos
            created_at = base_timestamp + timedelta(
                days=random.randint(0, 180),
                hours=random.randint(0, 23),
                minutes=random.randint(0, 59)
            )

            # Selecionar 1 a 3 clientes para este usuário
            num_clients = random.randint(1, min(3, len(clients_pool)))
            assigned_clients = random.sample(clients_pool, num_clients)

            user = models.User(
                email=email,
                hashed_password=precomputed_hash,
                full_name=full_name,
                role=role,
                seller_weight=seller_weight,
                is_active=is_active,
                created_at=created_at,
                setup_completed=True,
                setup_percentage=100,
                blocked_features="[]",
                blocked_nodes="[]",
                accessible_clients=assigned_clients
            )
            users_to_add.append(user)

            if len(users_to_add) >= 200:
                db.add_all(users_to_add)
                db.commit()
                print(f"  -> {i}/1000 usuários inseridos...")
                users_to_add = []

        if users_to_add:
            db.add_all(users_to_add)
            db.commit()
            print("  -> 1000/1000 usuários inseridos com sucesso!")

        # 3. Criar 1500 Links de Convite
        print("Gerando 1500 links de convite...")
        invites_to_add = []
        invite_roles = ["admin"] * 35 + ["vendedor"] * 45 + ["user"] * 20

        for i in range(1, 1501):
            token = str(uuid.uuid4())
            role = random.choice(invite_roles)
            created_at = now - timedelta(days=random.randint(1, 90), hours=random.randint(0, 23))

            # Status distribution:
            # ~40% UTILIZADO (is_used = True)
            # ~35% PENDENTE (is_used = False, expires_at no futuro ou None)
            # ~25% EXPIRADO (is_used = False, expires_at no passado)
            rand_val = random.random()
            if rand_val < 0.40:
                # Utilizado
                is_used = True
                expires_at = created_at + timedelta(days=random.choice([1, 7, 30]))
            elif rand_val < 0.75:
                # Pendente
                is_used = False
                expire_type = random.choice(["24h", "3d", "7d", "30d", "none"])
                if expire_type == "none":
                    expires_at = None
                elif expire_type == "24h":
                    expires_at = now + timedelta(hours=random.randint(2, 24))
                elif expire_type == "3d":
                    expires_at = now + timedelta(days=random.randint(1, 3))
                elif expire_type == "7d":
                    expires_at = now + timedelta(days=random.randint(4, 7))
                else:
                    expires_at = now + timedelta(days=random.randint(10, 30))
            else:
                # Expirado
                is_used = False
                expires_at = created_at + timedelta(days=random.choice([1, 3]))
                if expires_at > now:
                    expires_at = now - timedelta(hours=random.randint(1, 72))

            # Selecionar 1 a 3 clientes para este convite
            num_clients = random.randint(1, min(3, len(clients_pool)))
            assigned_clients = random.sample(clients_pool, num_clients)

            invite = models.UserInvitation(
                token=token,
                role=role,
                expires_at=expires_at,
                is_used=is_used,
                created_at=created_at,
                created_by_id=super_admin_id,
                blocked_features="[]",
                blocked_nodes="[]",
                accessible_clients=assigned_clients
            )
            invites_to_add.append(invite)

            if len(invites_to_add) >= 300:
                db.add_all(invites_to_add)
                db.commit()
                print(f"  -> {i}/1500 convites inseridos...")
                invites_to_add = []

        if invites_to_add:
            db.add_all(invites_to_add)
            db.commit()
            print("  -> 1500/1500 convites inseridos com sucesso!")

        total_users = db.query(models.User).count()
        total_invites = db.query(models.UserInvitation).count()
        print(f"\n✅ CONCLUÍDO COM SUCESSO!")
        print(f"  - Total de Usuários no Banco: {total_users}")
        print(f"  - Total de Convites no Banco: {total_invites}")
        print(f"  - Total de Clientes no Banco: {len(clients_pool)}")

    except Exception as e:
        db.rollback()
        print(f"❌ Erro durante o seed: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed()
