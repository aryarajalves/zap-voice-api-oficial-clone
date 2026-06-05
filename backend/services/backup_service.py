"""
Serviço de Backup do Banco de Dados PostgreSQL para Backblaze S3.

Responsabilidades:
- Executar pg_dump e compactar com gzip
- Fazer upload do arquivo para o S3 (prefixo backups/)
- Aplicar política de retenção (deletar os mais antigos)
- Listar backups existentes no bucket
"""

import os
import gzip
import subprocess
import tempfile
import re
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from core.logger import logger


class BackupService:
    BACKUP_PREFIX = "backups/"

    def __init__(self):
        self.endpoint_url = self._clean(os.getenv("S3_ENDPOINT_URL"))
        self.access_key = self._clean(os.getenv("S3_ACCESS_KEY"))
        self.secret_key = self._clean(os.getenv("S3_SECRET_KEY"))
        self.bucket_name = self._clean(os.getenv("S3_BUCKET_NAME")) or "zapvoice-files"
        self.region = self._clean(os.getenv("S3_REGION")) or "us-east-1"

        # Pega a variável de ambiente COMPANY_NAME
        company = self._clean(os.getenv("COMPANY_NAME")) or "zapvoice"
        
        # Remover acentos e sanitizar
        import unicodedata
        company_normalized = unicodedata.normalize('NFKD', company).encode('ascii', 'ignore').decode('utf-8')
        company_clean = re.sub(r"[^a-zA-Z0-9_]", "", company_normalized.replace(" ", "_").lower())
        if not company_clean:
            company_clean = "zapvoice"
            
        backup_prefix_default = f"backups_{company_clean}/"
        
        self.prefix = self._clean(os.getenv("S3_BACKUP_PREFIX")) or backup_prefix_default

        self._s3 = None

    def _clean(self, value: Optional[str]) -> Optional[str]:
        if not value:
            return None
        return value.split('#')[0].strip().strip('"').strip("'")

    def _get_s3(self):
        """Inicializa client S3 lazy (somente quando necessário)."""
        if self._s3 is not None:
            return self._s3

        if not self.endpoint_url or not self.access_key:
            raise RuntimeError("Credenciais S3 não configuradas. Verifique S3_ENDPOINT_URL, S3_ACCESS_KEY e S3_SECRET_KEY no .env.")

        self._s3 = boto3.client(
            's3',
            endpoint_url=self.endpoint_url,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            region_name=self.region,
            config=Config(signature_version='s3v4')
        )
        return self._s3

    def _parse_database_url(self) -> dict:
        """Extrai host, porta, usuário, senha e dbname da DATABASE_URL."""
        db_url = os.getenv("DATABASE_URL", "")
        # postgresql://user:password@host:port/dbname
        pattern = r"postgresql(?:\+psycopg2)?://([^:]+):([^@]+)@([^:/]+):?(\d+)?/(.+)"
        match = re.match(pattern, db_url)
        if not match:
            raise RuntimeError(f"DATABASE_URL inválida ou não é PostgreSQL: {db_url}")

        user, password, host, port, dbname = match.groups()
        return {
            "user": user,
            "password": password,
            "host": host,
            "port": port or "5432",
            "dbname": dbname.split("?")[0],  # Remove query params se houver
        }

    def _generate_filename(self) -> str:
        """Gera um nome de arquivo único para o backup no horário de Brasília."""
        # Horário de Brasília (UTC-3)
        tz_brasilia = timezone(timedelta(hours=-3))
        now = datetime.now(tz_brasilia)
        timestamp = now.strftime("%Y_%m_%d_%H_%M")
        
        # Prioridade: COMPANY_NAME do env > APP_NAME do banco > "zapvoice"
        company = os.getenv("COMPANY_NAME")
        if not company:
            try:
                from database import SessionLocal
                from models import AppConfig
                db = SessionLocal()
                try:
                    cfg = db.query(AppConfig).filter(AppConfig.key == "APP_NAME").first()
                    if cfg and cfg.value:
                        company = cfg.value
                finally:
                    db.close()
            except Exception as e:
                logger.error(f"[BACKUP] Erro ao buscar APP_NAME no banco: {e}")
                
        if not company:
            company = "zapvoice"
            
        # Remover acentos e sanitizar
        import unicodedata
        company_normalized = unicodedata.normalize('NFKD', company).encode('ascii', 'ignore').decode('utf-8')
        company_clean = re.sub(r"[^a-zA-Z0-9_]", "", company_normalized.replace(" ", "_").lower())
        if not company_clean:
            company_clean = "zapvoice"
            
        return f"{company_clean}_backup_{timestamp}.dump.gz"



    def run_backup(self) -> dict:
        """
        Executa o backup completo:
        1. pg_dump → gzip → upload S3
        Retorna metadados do backup (filename, size, timestamp).
        """
        logger.info("🗄️ [BACKUP] Iniciando backup do banco de dados...")

        try:
            db = self._parse_database_url()
        except RuntimeError as e:
            logger.error(f"❌ [BACKUP] Erro ao parsear DATABASE_URL: {e}")
            raise

        filename = self._generate_filename()
        s3_key = f"{self.prefix}{filename}"

        env = os.environ.copy()
        env["PGPASSWORD"] = db["password"]

        cmd = [
            "pg_dump",
            "-h", db["host"],
            "-p", db["port"],
            "-U", db["user"],
            "-F", "c",   # Custom format (binary, compressível)
            "--no-owner",
            "--no-acl",
            db["dbname"],
        ]

        logger.info(f"🗄️ [BACKUP] Executando pg_dump para {db['dbname']}@{db['host']}:{db['port']}...")

        try:
            with tempfile.NamedTemporaryFile(suffix=".dump", delete=False) as tmp_file:
                tmp_path = tmp_file.name

            result = subprocess.run(
                cmd,
                env=env,
                stdout=open(tmp_path, "wb"),
                stderr=subprocess.PIPE,
                timeout=300  # 5 minutos máx
            )

            if result.returncode != 0:
                stderr_msg = result.stderr.decode("utf-8", errors="replace")
                raise RuntimeError(f"pg_dump falhou (código {result.returncode}): {stderr_msg}")

            dump_size = os.path.getsize(tmp_path)
            logger.info(f"✅ [BACKUP] pg_dump concluído. Tamanho: {dump_size / 1024:.1f} KB. Comprimindo...")

            # Comprime com gzip
            gz_path = tmp_path + ".gz"
            with open(tmp_path, "rb") as f_in, gzip.open(gz_path, "wb") as f_out:
                f_out.write(f_in.read())

            gz_size = os.path.getsize(gz_path)
            logger.info(f"✅ [BACKUP] Compressão concluída. Tamanho final: {gz_size / 1024:.1f} KB. Enviando para S3...")

            # Upload para S3
            s3 = self._get_s3()
            with open(gz_path, "rb") as f:
                s3.upload_fileobj(
                    f,
                    self.bucket_name,
                    s3_key,
                    ExtraArgs={"ContentType": "application/gzip"}
                )

            logger.info(f"✅ [BACKUP] Upload concluído: s3://{self.bucket_name}/{s3_key}")

        finally:
            # Limpeza de arquivos temporários
            for p in [tmp_path, gz_path]:
                try:
                    if os.path.exists(p):
                        os.unlink(p)
                except Exception:
                    pass

        return {
            "filename": filename,
            "s3_key": s3_key,
            "size_bytes": gz_size,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

    def apply_retention(self, retention_count: int):
        """
        Aplica a política de retenção: mantém apenas os `retention_count` backups mais recentes.
        Remove os mais antigos automaticamente.
        """
        if retention_count <= 0:
            logger.warning("[BACKUP] retention_count <= 0, pulando limpeza.")
            return

        backups = self.list_backups()
        if len(backups) <= retention_count:
            logger.info(f"[BACKUP] Retenção OK ({len(backups)}/{retention_count} backups). Nenhum arquivo removido.")
            return

        # Ordena do mais antigo para o mais recente e remove os excedentes
        to_delete = backups[retention_count:]  # lista já vem ordenada do mais novo para o mais antigo
        logger.info(f"[BACKUP] Retenção: removendo {len(to_delete)} backup(s) antigo(s)...")

        s3 = self._get_s3()
        for bkp in to_delete:
            try:
                s3.delete_object(Bucket=self.bucket_name, Key=bkp["s3_key"])
                logger.info(f"🗑️ [BACKUP] Backup removido por retenção: {bkp['filename']}")
            except Exception as e:
                logger.error(f"❌ [BACKUP] Falha ao remover {bkp['filename']}: {e}")

    def list_backups(self) -> List[dict]:
        """
        Lista todos os backups no S3 (dentro do prefixo configurado).
        Retorna ordenado do mais recente para o mais antigo.
        """
        s3 = self._get_s3()
        try:
            response = s3.list_objects_v2(Bucket=self.bucket_name, Prefix=self.prefix)
        except ClientError as e:
            logger.error(f"❌ [BACKUP] Falha ao listar backups no S3: {e}")
            raise RuntimeError(f"Falha ao listar backups no S3: {str(e)}")

        contents = response.get("Contents", [])
        backups = []
        for obj in contents:
            key = obj["Key"]
            if not key.endswith(".gz"):
                continue
            filename = key.replace(self.prefix, "")
            backups.append({
                "filename": filename,
                "s3_key": key,
                "size_bytes": obj["Size"],
                "created_at": obj["LastModified"].isoformat(),
            })

        # Ordenar do mais recente para o mais antigo
        backups.sort(key=lambda x: x["created_at"], reverse=True)
        return backups

    def delete_backup(self, filename: str):
        """Remove um backup específico do S3."""
        # Sanitizar: não permitir path traversal
        if "/" in filename or "\\" in filename:
            raise ValueError("Nome de arquivo inválido.")

        s3_key = f"{self.prefix}{filename}"
        s3 = self._get_s3()
        try:
            s3.delete_object(Bucket=self.bucket_name, Key=s3_key)
            logger.info(f"🗑️ [BACKUP] Backup deletado manualmente: {s3_key}")
        except ClientError as e:
            logger.error(f"❌ [BACKUP] Falha ao deletar {s3_key}: {e}")
            raise RuntimeError(f"Falha ao deletar backup: {str(e)}")

    def restore_backup(self, filename: str):
        """
        Restaura o banco de dados PostgreSQL a partir de um backup do S3.
        1. Valida nome.
        2. Baixa o arquivo do S3 para temporário.
        3. Descompacta se for .gz.
        4. Encerra conexões ativas na base para evitar travamentos de lock.
        5. Executa pg_restore.
        """
        logger.info(f"🗄️ [RESTORE] Iniciando restauração do backup: {filename}")

        if "/" in filename or "\\" in filename:
            raise ValueError("Nome de arquivo inválido.")

        s3_key = f"{self.prefix}{filename}"
        s3 = self._get_s3()

        try:
            db = self._parse_database_url()
        except RuntimeError as e:
            logger.error(f"❌ [RESTORE] Erro ao parsear DATABASE_URL: {e}")
            raise

        tmp_path = None
        gz_path = None

        try:
            # Baixar do S3
            with tempfile.NamedTemporaryFile(suffix=".dump.gz", delete=False) as tmp_file:
                gz_path = tmp_file.name

            logger.info(f"🗄️ [RESTORE] Baixando backup de s3://{self.bucket_name}/{s3_key}...")
            s3.download_file(self.bucket_name, s3_key, gz_path)

            # Descompactar
            tmp_path = gz_path.replace(".dump.gz", ".dump")
            logger.info(f"🗄️ [RESTORE] Descompactando {gz_path}...")
            with gzip.open(gz_path, "rb") as f_in, open(tmp_path, "wb") as f_out:
                f_out.write(f_in.read())

            # Liberar conexões do banco de dados para evitar travar no drop table
            logger.info("🗄️ [RESTORE] Encerrando conexões ativas no banco de dados...")
            from sqlalchemy import create_engine, text
            engine = create_engine(os.getenv("DATABASE_URL"))
            with engine.connect() as conn:
                conn.execute(text(
                    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
                    "WHERE datname = :dbname AND pid <> pg_backend_pid();"
                ).bindparams(dbname=db["dbname"]))
                conn.execute(text("commit"))
            engine.dispose()

            # Executar pg_restore
            env = os.environ.copy()
            env["PGPASSWORD"] = db["password"]

            cmd = [
                "pg_restore",
                "-h", db["host"],
                "-p", db["port"],
                "-U", db["user"],
                "-d", db["dbname"],
                "-c",              # clean (drop) database objects before recreating
                "--if-exists",     # use IF EXISTS when dropping objects
                tmp_path
            ]

            logger.info(f"🗄️ [RESTORE] Executando pg_restore no banco {db['dbname']}...")
            result = subprocess.run(
                cmd,
                env=env,
                stderr=subprocess.PIPE,
                stdout=subprocess.PIPE,
                timeout=300
            )

            if result.returncode not in (0, 1):
                stderr_msg = result.stderr.decode("utf-8", errors="replace")
                raise RuntimeError(f"pg_restore falhou (código {result.returncode}): {stderr_msg}")
            elif result.returncode == 1:
                stderr_msg = result.stderr.decode("utf-8", errors="replace")
                logger.warning(f"⚠️ [RESTORE] pg_restore concluído com avisos/erros não-fatais (código 1): {stderr_msg}")

            logger.info("✅ [RESTORE] Restauração do banco de dados concluída com sucesso!")

        except Exception as e:
            logger.error(f"❌ [RESTORE] Falha na restauração do backup: {e}")
            raise
        finally:
            # Limpar temporários
            for p in [gz_path, tmp_path]:
                try:
                    if p and os.path.exists(p):
                        os.unlink(p)
                except Exception:
                    pass

    def upload_backup(self, file_data, original_filename: str) -> dict:
        """
        Recebe um arquivo de backup de outro servidor,
        compacta com gzip se necessário, e faz upload para o S3.
        """
        logger.info(f"🗄️ [UPLOAD-BACKUP] Processando upload de backup: {original_filename}")

        # Sanitizar nome
        clean_name = re.sub(r"[^a-zA-Z0-9_\-\.]", "_", original_filename)
        if not clean_name:
            clean_name = "backup_upload.dump"

        # Garantir que geramos com timestamp para evitar sobrescrever backups
        tz_brasilia = timezone(timedelta(hours=-3))
        now = datetime.now(tz_brasilia)
        timestamp = now.strftime("%Y%m%d_%H%M%S")

        is_gz = clean_name.endswith(".gz")
        base_name = clean_name.replace(".gz", "").replace(".dump", "")
        filename = f"backup_{base_name}_{timestamp}.dump.gz"
        s3_key = f"{self.prefix}{filename}"

        tmp_path = None
        gz_path = None

        try:
            # Escrever em arquivo temporário
            with tempfile.NamedTemporaryFile(suffix=".dump", delete=False) as tmp_file:
                tmp_path = tmp_file.name
                while chunk := file_data.read(1024 * 1024):
                    tmp_file.write(chunk)

            if is_gz:
                gz_path = tmp_path
                gz_size = os.path.getsize(gz_path)
            else:
                gz_path = tmp_path + ".gz"
                logger.info("🗄️ [UPLOAD-BACKUP] Comprimindo arquivo importado...")
                with open(tmp_path, "rb") as f_in, gzip.open(gz_path, "wb") as f_out:
                    f_out.write(f_in.read())
                gz_size = os.path.getsize(gz_path)

            # Upload para S3
            s3 = self._get_s3()
            with open(gz_path, "rb") as f:
                s3.upload_fileobj(
                    f,
                    self.bucket_name,
                    s3_key,
                    ExtraArgs={"ContentType": "application/gzip"}
                )

            logger.info(f"✅ [UPLOAD-BACKUP] Upload do backup importado concluído: s3://{self.bucket_name}/{s3_key}")

        finally:
            for p in [tmp_path, gz_path]:
                try:
                    if p and os.path.exists(p):
                        os.unlink(p)
                except Exception:
                    pass

        return {
            "filename": filename,
            "s3_key": s3_key,
            "size_bytes": gz_size,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

    def calculate_next_backup(self, interval_type: str, interval_value: int) -> datetime:
        """Calcula a data/hora do próximo backup com base na configuração."""
        now = datetime.now(timezone.utc)
        if interval_type == "hours":
            return now + timedelta(hours=interval_value)
        elif interval_type == "days":
            return now + timedelta(days=interval_value)
        return None


# Instância global do serviço
backup_service = BackupService()
