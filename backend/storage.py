
import boto3
import os
import shutil
from botocore.exceptions import ClientError
from uuid import uuid4
from core.logger import setup_logger

logger = setup_logger(__name__)

class StorageClient:
    def __init__(self):
        from config_loader import get_setting

        self.endpoint_url = get_setting("S3_ENDPOINT_URL")
        self.access_key = get_setting("S3_ACCESS_KEY")
        self.secret_key = get_setting("S3_SECRET_KEY")
        self.bucket_name = get_setting("S3_BUCKET_NAME") or "zapvoice-files"
        self.region = get_setting("S3_REGION") or "us-east-1"

        if self.endpoint_url: self.endpoint_url = self.endpoint_url.split('#')[0].strip().strip('"').strip("'")
        if self.access_key: self.access_key = self.access_key.split('#')[0].strip().strip('"').strip("'")
        if self.secret_key: self.secret_key = self.secret_key.split('#')[0].strip().strip('"').strip("'")
        if self.bucket_name: self.bucket_name = self.bucket_name.split('#')[0].strip().strip('"').strip("'")
        if self.region: self.region = self.region.split('#')[0].strip().strip('"').strip("'")
        
        if self.endpoint_url and self.access_key:
            try:
                logger.info(f"Conectando ao S3: {self.endpoint_url} (Region: {self.region})")
                from botocore.config import Config
                
                self.s3_client = boto3.client(
                    's3',
                    endpoint_url=self.endpoint_url,
                    aws_access_key_id=self.access_key,
                    aws_secret_access_key=self.secret_key,
                    region_name=self.region,
                    config=Config(signature_version='s3v4')
                )
                self._ensure_bucket_exists()
            except Exception as e:
                logger.error(f"Erro CRITICO ao inicializar S3: {str(e)}")
                self.s3_client = None
                logger.warning("S3 desativado devido a erro de configuracao. Usando modo Local.")
        else:
            logger.warning("StorageClient: Configuracoes S3 incompletas. Usando armazenamento local.")
            self.s3_client = None

    def _ensure_bucket_exists(self):
        if not self.s3_client: return
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
        except Exception as e:
            if "InvalidAccessKeyId" in str(e) or "SignatureDoesNotMatch" in str(e) or "403" in str(e) or "401" in str(e):
                logger.error(f"❌ Erro de Autenticacao S3: {e}. Desativando modo S3 e usando modo Local.")
                self.s3_client = None # Desativa para o restante da execucao
                return
            
            logger.info(f"Bucket '{self.bucket_name}' nao encontrado ou inacessivel. Tentando criar...")
            try:
                self.s3_client.create_bucket(Bucket=self.bucket_name)
                self._set_public_policy()
            except Exception as e2:
                logger.error(f"Falha ao criar bucket: {e2}")
                self.s3_client = None

    def _set_public_policy(self):
        if not self.s3_client: return
        try:
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
            logger.info(f"Bucket '{self.bucket_name}' configurado como PUBLICO")
        except Exception as e:
            logger.warning(f"Nao foi possivel configurar politica publica no bucket: {e}")

    def _get_url_for_file(self, filename):
        """Helper para gerar a URL pública baseada nas configurações atuais."""
        public_url_base = os.getenv("S3_PUBLIC_URL")
        if public_url_base:
            if public_url_base.endswith("/"): public_url_base = public_url_base[:-1]
            
            # Se a URL base for o formato antigo (sem o bucket no subdominio) e for Backblaze, corrigimos
            # Procuramos por bucket. (virtual-host) ou /bucket (path-style)
            has_bucket = f"{self.bucket_name}." in public_url_base or f"/{self.bucket_name}" in public_url_base
            
            if "backblazeb2.com" in public_url_base and not has_bucket:
                 parts = public_url_base.split("://")
                 if len(parts) == 2:
                     return f"{parts[0]}://{self.bucket_name}.{parts[1]}/{filename}"
            
            # Se já tiver o bucket em qualquer lugar da URL base, apenas anexamos o arquivo
            if has_bucket:
                return f"{public_url_base}/{filename}"
            
            return f"{public_url_base}/{self.bucket_name}/{filename}"

        if self.endpoint_url and ("minio" in self.endpoint_url):
            return f"{self.endpoint_url.replace('//minio', '//localhost').replace('//zapvoice-minio', '//localhost')}/{self.bucket_name}/{filename}"

        if self.endpoint_url and "amazonaws.com" not in self.endpoint_url:
             endpoint = self.endpoint_url
             if endpoint.endswith("/"): endpoint = endpoint[:-1]
             
             # Para Backblaze B2 S3, o estilo Virtual-Host (bucket no subdominio) é mais confiavel para acesso publico
             if "backblazeb2.com" in endpoint:
                 # endpoint e.g. https://s3.us-west-004.backblazeb2.com
                 parts = endpoint.split("://")
                 if len(parts) == 2:
                     return f"{parts[0]}://{self.bucket_name}.{parts[1]}/{filename}"
             
             return f"{endpoint}/{self.bucket_name}/{filename}"
        
        return f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{filename}"

    def get_public_url(self, filename_or_path):
        """Converte um caminho local ou nome de arquivo em uma URL pública acessível."""
        if not filename_or_path: return ""
        if str(filename_or_path).startswith(("http://", "https://")):
            # Se for uma URL do nosso Backblaze no formato antigo (path-style), re-formatamos para o novo (virtual-host)
            # Verificação case-insensitive para o bucket
            if "backblazeb2.com" in filename_or_path.lower() and f"/{self.bucket_name.lower()}/" in filename_or_path.lower():
                filename = filename_or_path.split("/")[-1] # Pega apenas o nome do arquivo
                return self._get_url_for_file(filename)
            return filename_or_path
            
        filename = os.path.basename(filename_or_path)
        if not self.s3_client:
            # Fallback local com URL absoluta para Meta/WhatsApp
            api_url = os.getenv("VITE_API_URL", "")
            base_url = api_url.replace("/api", "") if api_url else ""
            
            if not base_url:
                domain = os.getenv("DOMAIN", "")
                if domain:
                    base_url = f"https://{domain}"
            
            if base_url:
                if base_url.endswith("/"): base_url = base_url[:-1]
                return f"{base_url}/static/uploads/{filename}"
                
            return f"/static/uploads/{filename}"
            
        return self._get_url_for_file(filename)

    def upload_file(self, file_obj, filename, content_type):
        logger.info(f"📤 [STORAGE] Iniciando upload: {filename}")
        if not self.s3_client:
            try:
                upload_dir = "static/uploads"
                os.makedirs(upload_dir, exist_ok=True)
                file_path = os.path.join(upload_dir, filename)
                
                if hasattr(file_obj, 'seek'):
                     file_obj.seek(0)

                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(file_obj, buffer)
                
                logger.info(f"Arquivo salvo localmente: {file_path}")
                logger.info(f"✅ [STORAGE] Arquivo salvo localmente: {file_path}")
                return self.get_public_url(filename)
            except Exception as e:
                logger.error(f"Erro upload Local: {e}")
                raise e
        
        try:
            if hasattr(file_obj, 'seek'):
                file_obj.seek(0)
                
            self.s3_client.upload_fileobj(
                file_obj,
                self.bucket_name,
                filename,
                ExtraArgs={'ContentType': content_type}
            )
            return self._get_url_for_file(filename)
        except Exception as e:
            import traceback
            logger.error(f"Erro upload S3 (Detalhado): {str(e)}")
            logger.error(traceback.format_exc())
            raise e

storage = StorageClient()
