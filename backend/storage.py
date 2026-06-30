
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

        # === Provider Principal: MinIO (S3_*) ===
        self.endpoint_url = os.getenv("S3_ENDPOINT_URL")
        self.access_key = os.getenv("S3_ACCESS_KEY")
        self.secret_key = os.getenv("S3_SECRET_KEY")
        self.bucket_name = os.getenv("S3_BUCKET_NAME") or "zapvoice-files"
        self.region = os.getenv("S3_REGION") or "us-east-1"

        if self.endpoint_url: self.endpoint_url = self.endpoint_url.split('#')[0].strip().strip('"').strip("'")
        if self.access_key: self.access_key = self.access_key.split('#')[0].strip().strip('"').strip("'")
        if self.secret_key: self.secret_key = self.secret_key.split('#')[0].strip().strip('"').strip("'")
        if self.bucket_name: self.bucket_name = self.bucket_name.split('#')[0].strip().strip('"').strip("'")
        if self.region: self.region = self.region.split('#')[0].strip().strip('"').strip("'")

        # === Provider Fallback: Backblaze (BACKBLAZE_*) ===
        self._bb_endpoint = (os.getenv("BACKBLAZE_S3_ENDPOINT_URL") or "").split('#')[0].strip().strip('"').strip("'")
        self._bb_access_key = (os.getenv("BACKBLAZE_S3_ACCESS_KEY") or "").split('#')[0].strip().strip('"').strip("'")
        self._bb_secret_key = (os.getenv("BACKBLAZE_S3_SECRET_KEY") or "").split('#')[0].strip().strip('"').strip("'")
        self._bb_bucket = (os.getenv("BACKBLAZE_S3_BUCKET_NAME") or "zapvoice-files").split('#')[0].strip().strip('"').strip("'")
        self._bb_region = (os.getenv("BACKBLAZE_S3_REGION") or "us-west-004").split('#')[0].strip().strip('"').strip("'")
        self._bb_public_url = (os.getenv("BACKBLAZE_S3_PUBLIC_URL") or "").split('#')[0].strip().strip('"').strip("'")
        self._bb_client = None

        # Inicializar cliente Backblaze se configurado
        if self._bb_endpoint and self._bb_access_key:
            try:
                from botocore.config import Config
                self._bb_client = boto3.client(
                    's3',
                    endpoint_url=self._bb_endpoint,
                    aws_access_key_id=self._bb_access_key,
                    aws_secret_access_key=self._bb_secret_key,
                    region_name=self._bb_region,
                    config=Config(signature_version='s3v4')
                )
                logger.info(f"✅ [STORAGE] Backblaze configurado como fallback: {self._bb_endpoint}")
            except Exception as e:
                logger.error(f"❌ [STORAGE] Falha ao inicializar Backblaze: {e}")
                self._bb_client = None

        # Auto-detectar se o host do MinIO no Docker é resolvível (caso contrário, mapear para localhost:9005)
        if self.endpoint_url and "zapvoice-minio" in self.endpoint_url:
            import socket
            try:
                socket.gethostbyname("zapvoice-minio")
            except socket.gaierror:
                self.endpoint_url = self.endpoint_url.replace("zapvoice-minio:9000", "localhost:9005")
                self.endpoint_url = self.endpoint_url.replace("zapvoice-minio", "localhost")
                logger.info(f"🔄 [STORAGE] Rodando fora do Docker. Mapeando endpoint do MinIO para: {self.endpoint_url}")

        if self.endpoint_url and self.access_key:
            try:
                logger.info(f"Conectando ao S3 (MinIO): {self.endpoint_url} (Region: {self.region})")
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
                logger.error(f"Erro CRITICO ao inicializar MinIO: {str(e)}")
                self.s3_client = None
                logger.warning("MinIO desativado. Tentando Backblaze como fallback...")
        else:
            logger.warning("StorageClient: Configuracoes MinIO incompletas. Usando armazenamento local.")
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
        # Se for MinIO local, usar o proxy de mídia do backend
        if self.endpoint_url and ("minio" in self.endpoint_url or "localhost" in self.endpoint_url or "127.0.0.1" in self.endpoint_url):
            api_url = os.getenv("VITE_API_URL", "").strip('"').strip("'")
            base_url = ""
            if api_url:
                if api_url.endswith("/api"):
                    base_url = api_url[:-4]
                elif api_url.endswith("/api/"):
                    base_url = api_url[:-5]
                else:
                    base_url = api_url
            if not base_url:
                domain = os.getenv("DOMAIN", "")
                if domain:
                    base_url = f"https://{domain}"
            if base_url:
                if base_url.endswith("/"): base_url = base_url[:-1]
                return f"{base_url}/api/media/proxy/{filename}"

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
        if self.endpoint_url and ("minio" in self.endpoint_url or "localhost" in self.endpoint_url or "127.0.0.1" in self.endpoint_url):
            api_url = os.getenv("VITE_API_URL", "")
            base_url = ""
            if api_url:
                try:
                    from urllib.parse import urlparse
                    parsed = urlparse(api_url.strip('"').strip("'"))
                    base_url = f"{parsed.scheme}://{parsed.netloc}"
                except Exception:
                    base_url = ""
            if not base_url:
                domain = os.getenv("DOMAIN", "")
                if domain:
                    base_url = f"https://{domain}"
            if base_url:
                if base_url.endswith("/"): base_url = base_url[:-1]
                return f"{base_url}/api/media/proxy/{filename}"
                
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
            logger.info(f"✅ [STORAGE] Upload concluído no MinIO: {filename}")
            return self._get_url_for_file(filename)
        except Exception as e:
            import traceback
            logger.error(f"❌ [STORAGE] Erro upload MinIO: {str(e)}")
            logger.error(traceback.format_exc())

            # Fallback: tentar Backblaze
            if self._bb_client:
                try:
                    logger.warning(f"⚠️ [STORAGE] MinIO falhou. Tentando Backblaze como fallback para: {filename}")
                    if hasattr(file_obj, 'seek'):
                        file_obj.seek(0)
                    self._bb_client.upload_fileobj(
                        file_obj,
                        self._bb_bucket,
                        filename,
                        ExtraArgs={'ContentType': content_type}
                    )
                    # Gerar URL pública do Backblaze
                    bb_public = self._bb_public_url or self._bb_endpoint
                    if bb_public.endswith("/"): bb_public = bb_public[:-1]
                    has_bucket = f"{self._bb_bucket}." in bb_public or f"/{self._bb_bucket}" in bb_public
                    if "backblazeb2.com" in bb_public and not has_bucket:
                        parts = bb_public.split("://")
                        url = f"{parts[0]}://{self._bb_bucket}.{parts[1]}/{filename}" if len(parts) == 2 else f"{bb_public}/{filename}"
                    elif has_bucket:
                        url = f"{bb_public}/{filename}"
                    else:
                        url = f"{bb_public}/{self._bb_bucket}/{filename}"
                    logger.info(f"✅ [STORAGE] Upload concluído no Backblaze (fallback): {url}")
                    return url
                except Exception as e2:
                    logger.error(f"❌ [STORAGE] Erro upload Backblaze (fallback): {str(e2)}")
                    raise e2

            raise e

    def get_file(self, filename: str):
        """Busca o arquivo e retorna um stream/bytes ou File-like Object do S3/MinIO ou local."""
        if not self.s3_client:
            upload_dir = "static/uploads"
            file_path = os.path.join(upload_dir, filename)
            if os.path.exists(file_path):
                return open(file_path, "rb")
            return None
        try:
            response = self.s3_client.get_object(
                Bucket=self.bucket_name,
                Key=filename
            )
            return response['Body']
        except Exception as e:
            logger.error(f"Erro ao buscar arquivo do S3/MinIO: {e}")
            if self._bb_client:
                try:
                    response = self._bb_client.get_object(
                        Bucket=self._bb_bucket,
                        Key=filename
                    )
                    return response['Body']
                except Exception as e2:
                    logger.error(f"Erro ao buscar arquivo do Backblaze (fallback): {e2}")
            return None

    def delete_file(self, filename: str):
        """Remove fisicamente o arquivo do S3/MinIO ou do disco local."""
        logger.info(f"🗑️ [STORAGE] Solicitada remoção do arquivo: {filename}")
        if not self.s3_client:
            try:
                upload_dir = "static/uploads"
                file_path = os.path.join(upload_dir, filename)
                if os.path.exists(file_path):
                    os.remove(file_path)
                    logger.info(f"🗑️ [STORAGE] Arquivo local removido: {file_path}")
                else:
                    logger.warning(f"⚠️ [STORAGE] Arquivo local não encontrado para remoção: {file_path}")
            except Exception as e:
                logger.error(f"Erro ao remover arquivo local: {e}")
            return

        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=filename
            )
            logger.info(f"✅ [STORAGE] Arquivo removido do S3: {filename}")
        except Exception as e:
            logger.error(f"Erro ao remover arquivo do S3: {e}")
            raise e

storage = StorageClient()
