
import socket
import logging

def check_port(host, port, name):
    try:
        with socket.create_connection((host, port), timeout=2):
            print(f"✅ {name} check: OPEN ({host}:{port})")
            return True
    except Exception as e:
        print(f"❌ {name} check: CLOSED/ERROR ({host}:{port}) - {e}")
        return False

if __name__ == "__main__":
    print("--- Infrastructure Check ---")
    check_port("localhost", 9000, "MinIO API")
    check_port("localhost", 9001, "MinIO Console")
    check_port("localhost", 5672, "RabbitMQ")
    check_port("localhost", 15672, "RabbitMQ Mgmt")
    check_port("localhost", 5432, "Postgres")
    check_port("localhost", 6379, "Redis")
