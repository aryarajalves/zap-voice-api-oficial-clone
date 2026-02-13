import os
import boto3
from datetime import datetime
import pytz

# Testando com as chaves de PRODUÇÃO fornecidas pelo usuário
s3_endpoint = "https://s3.us-east-005.backblazeb2.com"
s3_access_key = "0047daba280ace4000000000f"
s3_secret_key = "K004zPzo6KfHLNGAKb1vo/CUQOTOMcU"
s3_bucket_name = "zap-voice"
s3_region = "us-east-005"

print("--- Testing S3 with Production Keys on Localhost ---")
print(f"Current Time (Container): {datetime.now()}")
print(f"Endpoint: {s3_endpoint}")
print(f"Bucket: {s3_bucket_name}")

try:
    s3 = boto3.client(
        's3',
        endpoint_url=s3_endpoint,
        aws_access_key_id=s3_access_key,
        aws_secret_access_key=s3_secret_key,
        region_name=s3_region
    )

    print("\nAttempting to list objects (Head Bucket)...")
    s3.head_bucket(Bucket=s3_bucket_name)
    print("✅ Head Bucket: Success! (As chaves de produção FUNCIONAM no Localhost)")
    
    # Se chegamos aqui, o código está OK e as chaves de produção funcionam localmente.
except Exception as e:
    print(f"\n❌ FAILED with Production Keys: {str(e)}")
    if "InvalidAccessKeyId" in str(e):
        print("Note: The service rejected these specific credentials.")
    elif "SignatureDoesNotMatch" in str(e):
        print("Note: Clock skew or wrong secret key.")
