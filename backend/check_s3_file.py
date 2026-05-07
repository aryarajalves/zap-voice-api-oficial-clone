import boto3
import os
from storage import storage

def check_s3():
    if not storage.s3_client:
        print("S3 Client not initialized")
        return

    bucket = storage.bucket_name
    filename = "b9926301-364a-42f9-8505-f83f8827ff3f.jpg"
    
    try:
        storage.s3_client.head_object(Bucket=bucket, Key=filename)
        print(f"File {filename} EXISTS in bucket {bucket}")
        url = storage.get_public_url(filename)
        print(f"Public URL: {url}")
    except Exception as e:
        print(f"File {filename} NOT FOUND in bucket {bucket}: {e}")

check_s3()
