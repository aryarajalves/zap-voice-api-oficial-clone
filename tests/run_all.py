import subprocess
import sys
import os

def run_script(script_path):
    print(f"\n{'='*50}")
    print(f"Executando: {script_path}")
    print(f"{'='*50}")
    try:
        result = subprocess.run([sys.executable, script_path], capture_output=False, text=True)
        return result.returncode == 0
    except Exception as e:
        print(f"Erro ao executar {script_path}: {e}")
        return False

def main():
    test_dir = os.path.dirname(__file__)
    scripts = [
        "test_01_infra.py",
        "test_02_auth.py",
        "test_03_clients_settings.py",
        "test_04_funnels.py",
        "test_05_triggers.py",
        "test_06_webhooks_blocked.py",
        "test_07_uploads.py",
        "test_08_funnel_nodes.py",
        "test_09_bulk_delete.py",
        "test_10_security_scope.py",
        "test_11_duplicate_name.py",
        "test_12_window_24h.py",
        "test_13_queue_management.py",
    ]
            
    success_count = 0
    failed_scripts = []
    for script in scripts:
        full_path = os.path.join(test_dir, script)
        if os.path.exists(full_path):
            if run_script(full_path):
                success_count += 1
            else:
                failed_scripts.append(script)
        else:
            print(f"⚠️ Script não encontrado: {script}")

    print(f"\n{'='*50}")
    print(f"RESUMO DOS TESTES: {success_count}/{len(scripts)} scripts executados com sucesso.")
    if failed_scripts:
        print(f"❌ Scripts que falharam: {', '.join(failed_scripts)}")
        sys.exit(1)
    print(f"{'='*50}")

if __name__ == "__main__":
    main()
