
import boto3
import os
import shutil
from botocore.exceptions import ClientError
from uuid import uuid4
from core.logger import setup_logger

logger = setup_logger(__name__)

class StorageClient:
    def __init__(self):
        # Tenta pegar do banco, fallback para env
        # Nota: Storage costuma ser global, então pegamos sem client_id específico (assumindo config global)
        # ou pegamos de tudo. Por simplicidade, vamos usar get_setting que já faz o fallback.
        from config_loader import get_setting

        self.endpoint_url = get_setting("S3_ENDPOINT_URL")
        self.access_key = get_setting("S3_ACCESS_KEY")
        self.secret_key = get_setting("S3_SECRET_KEY")
        self.bucket_name = get_setting("S3_BUCKET_NAME") or "zapvoice-files"
        self.region = get_setting("S3_REGION") or "us-east-1"
        
        # Só inicializa se tiver config
        if self.endpoint_url and self.access_key:
            try:
                self.s3_client = boto3.client(
                    's3',
                    endpoint_url=self.endpoint_url,
                    aws_access_key_id=self.access_key,
                    aws_secret_access_key=self.secret_key,
                    region_name=self.region
                )
                self._ensure_bucket_exists()
            except Exception as e:
                logger.error(f"Erro ao conectar S3: {e}. Usando armazenamento local.")
                self.s3_client = None
        else:
            logger.warning("StorageClient: Configuracoes S3 nao encontradas. Usando armazenamento local.")
            self.s3_client = None

    def _ensure_bucket_exists(self):
        if not self.s3_client: return
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
        except ClientError:
            logger.info(f"Bucket '{self.bucket_name}' nao existe. Criando...")
            try:
                self.s3_client.create_bucket(Bucket=self.bucket_name)
                # Configurar policy para public-read (Opcional, mas útil para servir arquivos)
                self._set_public_policy()
            except Exception as e:
                logger.error(f"Erro ao criar bucket: {e}")

    def _set_public_policy(self):
        if not self.s3_client: return
        import json
        bucket_policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Sid": "PublicReadGetObject",
                    "Effect": "Allow",
                    "Principal": "*",
                    "Action": "s3:GetObject",
                    "Resource": f"arn:aws:s3:::{self.bucket_name}/*"
                }
            ]
        }
        self.s3_client.put_bucket_policy(
            Bucket=self.bucket_name,
            Policy=json.dumps(bucket_policy)
        )
        logger.info("Bucket configurado como PUBLICO")

    def upload_file(self, file_obj, filename, content_type):
        if not self.s3_client:
            # Fallback to local storage
            try:
                upload_dir = "static/uploads"
                os.makedirs(upload_dir, exist_ok=True)
                file_path = os.path.join(upload_dir, filename)
                
                # Reset file pointer just in case
                if hasattr(file_obj, 'seek'):
                     file_obj.seek(0)

                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(file_obj, buffer)
                
                logger.info(f"Arquivo salvo localmente: {file_path}")
                
                # Construct local URL
                # Assuming backend is on port 8000. Ideally use a config, but hardcoding for local fix is acceptable.
                base_url = os.getenv("API_BASE_URL", "http://127.0.0.1:8000")
                return f"{base_url}/{upload_dir}/{filename}"
                
            except Exception as e:
                logger.error(f"Erro upload Local: {e}")
                raise e
        
        try:
            # Reset file pointer
            if hasattr(file_obj, 'seek'):
                file_obj.seek(0)
                
            self.s3_client.upload_fileobj(
                file_obj,
                self.bucket_name,
                filename,
                ExtraArgs={'ContentType': content_type}
            )
            
            # Retorna URL pública
            # 1. Se tiver S3_PUBLIC_URL (ex: https://cdn.meudominio.com), usa ela
            public_url_base = os.getenv("S3_PUBLIC_URL")
            if public_url_base:
                # Remove barra final se tiver
                if public_url_base.endswith("/"): public_url_base = public_url_base[:-1]
                return f"{public_url_base}/{self.bucket_name}/{filename}"

            # 2. Se for ambiente Docker (minio/zapvoice-minio), troca por localhost para o navegador conseguir acessar
            if "minio" in self.endpoint_url:
                # Substituição robusta para minio ou zapvoice-minio
                # Se o endpoint for http://zapvoice-minio:9000, vira http://localhost:9000
                return f"{self.endpoint_url.replace('//minio', '//localhost').replace('//zapvoice-minio', '//localhost')}/{self.bucket_name}/{filename}"

            # 3. Fallback inteligente (S3 Genérico vs AWS)
            # Se temos um endpoint configurado que NÃO é o padrão da AWS, usamos ele
            if self.endpoint_url and "amazonaws.com" not in self.endpoint_url:
                 # Remove barra final se tiver
                 endpoint = self.endpoint_url
                 if endpoint.endswith("/"): endpoint = endpoint[:-1]
                 return f"{endpoint}/{self.bucket_name}/{filename}"
            
            # 4. Default AWS S3
            return f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{filename}"
                
        except Exception as e:
            import traceback
            logger.error(f"Erro upload S3 (Detalhado): {str(e)}")
            logger.error(traceback.format_exc())
            raise e

# Singleton
storage = StorageClient()
