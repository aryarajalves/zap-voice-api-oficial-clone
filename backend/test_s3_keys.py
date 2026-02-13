import os
import boto3
from dotenv import load_dotenv

# Force reload from .env in the current directory (which is mounted and updated)
load_dotenv(override=True)

print("--- Testing S3 Connection ---")

s3_endpoint = os.getenv("S3_ENDPOINT_URL")
s3_access_key = os.getenv("S3_ACCESS_KEY")
s3_secret_key = os.getenv("S3_SECRET_KEY")
s3_bucket_name = os.getenv("S3_BUCKET_NAME")
s3_region = os.getenv("S3_REGION", "us-east-1")

print(f"Endpoint: '{s3_endpoint}'")
print(f"Bucket: '{s3_bucket_name}'")
print(f"Region: '{s3_region}'")
print(f"Access Key (Repr): {repr(s3_access_key)}")
print(f"Secret Key (Repr): {repr(s3_secret_key[:5])}... (Len: {len(s3_secret_key)})")

# Mask keys
safe_access = s3_access_key[:4] + "*" * (len(s3_access_key)-8) + s3_access_key[-4:] if s3_access_key and len(s3_access_key) > 8 else "***"
print(f"Access Key (Masked): {safe_access}")

if not all([s3_endpoint, s3_access_key, s3_secret_key, s3_bucket_name]):
    print("❌ ERROR: Missing one or more S3 variables in .env")
    exit(1)

try:
    s3 = boto3.client(
        's3',
        endpoint_url=s3_endpoint.split('#')[0].strip(),
        aws_access_key_id=s3_access_key.split('#')[0].strip(),
        aws_secret_access_key=s3_secret_key.split('#')[0].strip(),
        region_name=s3_region.split('#')[0].strip()
    )

    # Test 1: List Objects in Bucket (Read Access)
    print("\nAttempting to list objects in bucket...")
    s3.list_objects_v2(Bucket=s3_bucket_name, MaxKeys=1)
    print("✅ List Objects: Success")

    # Test 2: Upload File (Write Access)
    print("Attempting to upload test file...")
    s3.put_object(Bucket=s3_bucket_name, Key='connection_test.txt', Body=b'Connection Test Success!')
    print("✅ Upload File: Success")
    
    print("\n🎉 S3 Configuration is VALID! You can restart your container now.")

except Exception as e:
    print(f"\n❌ FAILED: {str(e)}")
    print("\nPlease check your keys and try again.")
