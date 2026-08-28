#!/usr/bin/env python3
"""
Utilitário de Disparo de Webhooks do Portainer para CI/CD (GitHub Actions).
Suporta múltiplos webhooks configurados via JSON, multilinhas ou URL única.
Permite disparar todos os webhooks ('all') ou apenas um ambiente específico.
"""

import os
import sys
import json
import argparse
import urllib.request
import urllib.error
import re
from typing import Dict, Tuple

def mask_url(url: str) -> str:
    """Mascara o token ou id do webhook para proteção em logs públicos."""
    if not url:
        return ""
    # Mascara a parte final da URL após a última barra
    parts = url.strip().split('/')
    if len(parts) > 1:
        masked_tail = parts[-1][:4] + "****" if len(parts[-1]) > 4 else "****"
        return "/".join(parts[:-1]) + "/" + masked_tail
    return "****"

def parse_webhooks(raw_input: str) -> Dict[str, str]:
    """
    Analisa o conteúdo de entrada e retorna um dicionário {nome_ambiente: url_webhook}.
    Suporta:
      1. JSON: {"producao": "http...", "staging": "http..."}
      2. Multilinha chave=valor: producao=http...\nstaging=http...
      3. URL única: http://... (atribuída à chave 'default' ou 'producao')
    """
    if not raw_input or not raw_input.strip():
        return {}

    cleaned = raw_input.strip()

    # Tentativa 1: JSON
    if cleaned.startswith("{") and cleaned.endswith("}"):
        try:
            data = json.loads(cleaned)
            if isinstance(data, dict):
                return {str(k).strip(): str(v).strip() for k, v in data.items() if v}
        except json.JSONDecodeError:
            pass

    # Tentativa 2: Multilinha chave=valor ou chave: valor
    lines = cleaned.splitlines()
    parsed = {}
    is_key_value = False

    for line in lines:
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        
        if "=" in line:
            key, val = line.split("=", 1)
            parsed[key.strip()] = val.strip()
            is_key_value = True
        elif ":" in line and not line.startswith("http://") and not line.startswith("https://"):
            key, val = line.split(":", 1)
            parsed[key.strip()] = val.strip()
            is_key_value = True

    if is_key_value and parsed:
        return parsed

    # Tentativa 3: URL única direta
    if cleaned.startswith("http://") or cleaned.startswith("https://"):
        return {"default": cleaned}

    # Se forem múltiplas URLs soltas linha a linha
    urls = [l.strip() for l in lines if l.strip().startswith("http://") or l.strip().startswith("https://")]
    if urls:
        if len(urls) == 1:
            return {"default": urls[0]}
        return {f"servidor_{i+1}": u for i, u in enumerate(urls)}

    return {}

def trigger_webhook(name: str, url: str, timeout: int = 30) -> Tuple[bool, int, str]:
    """
    Executa o POST HTTP no webhook do Portainer.
    Retorna (sucesso, status_code, mensagem).
    """
    req = urllib.request.Request(
        url=url,
        data=b"",
        headers={
            "User-Agent": "GitHub-Actions-CI-CD/ZapVoice",
            "Content-Type": "application/json"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            status = response.status
            # Portainer responde 200, 204 ou similar em caso de sucesso
            if 200 <= status < 300:
                return True, status, "Sucesso"
            return False, status, f"Status HTTP inesperado: {status}"
    except urllib.error.HTTPError as e:
        # Se for 200/204 capturado como sucesso
        if 200 <= e.code < 300:
            return True, e.code, "Sucesso"
        return False, e.code, f"HTTP Error {e.code}: {e.reason}"
    except urllib.error.URLError as e:
        return False, 0, f"Falha de conexão: {str(e.reason)}"
    except Exception as e:
        return False, 0, f"Erro inesperado: {str(e)}"

def main():
    parser = argparse.ArgumentParser(description="Disparador de Webhooks do Portainer para CI/CD")
    parser.add_argument(
        "--target",
        default="all",
        help="Alvo do webhook a atualizar ('all' para todos, ou o nome do ambiente como 'producao', 'staging', etc.)"
    )
    parser.add_argument(
        "--webhooks-json",
        default="",
        help="String JSON ou chave=valor com os webhooks (se omitido, lê a variável de ambiente PORTAINER_WEBHOOKS)"
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=30,
        help="Timeout em segundos para cada requisição HTTP (padrão: 30s)"
    )

    args = parser.parse_args()

    raw_webhooks = args.webhooks_json or os.getenv("PORTAINER_WEBHOOKS", "") or os.getenv("PORTAINER_WEBHOOK_URL", "")
    
    if not raw_webhooks.strip():
        print("⚠️ [AVISO] Nenhuma variável de webhook do Portainer encontrada (PORTAINER_WEBHOOKS ou PORTAINER_WEBHOOK_URL).")
        print("ℹ️ Para habilitar o redeploy automático, adicione o secret 'PORTAINER_WEBHOOKS' no seu repositório GitHub.")
        sys.exit(0)

    webhooks_map = parse_webhooks(raw_webhooks)
    if not webhooks_map:
        print("❌ [ERRO] Formato de webhooks inválido ou nenhuma URL válida encontrada.")
        sys.exit(1)

    target = args.target.strip()
    print("=" * 60)
    print("🚀 DISPARADOR DE REDEPLOY DO PORTAINER")
    print(f"🎯 Alvo solicitado: {target}")
    print(f"📋 Total de webhooks configurados: {len(webhooks_map)}")
    print("=" * 60)

    # Filtrar webhooks com base no target
    to_dispatch = {}
    if target.lower() in ["all", "*", "todos"]:
        to_dispatch = webhooks_map
    else:
        # Busca exata ou insensível a maiúsculas/minúsculas
        matched_key = None
        for k in webhooks_map:
            if k.lower() == target.lower():
                matched_key = k
                break
        
        if matched_key:
            to_dispatch = {matched_key: webhooks_map[matched_key]}
        else:
            # Se o target fornecido for uma URL direta
            if target.startswith("http://") or target.startswith("https://"):
                to_dispatch = {"custom_target": target}
            else:
                print(f"❌ [ERRO] O alvo '{target}' não foi encontrado nos webhooks configurados.")
                print(f"Disponíveis: {list(webhooks_map.keys())}")
                sys.exit(1)

    failures = 0
    successes = 0

    for name, url in to_dispatch.items():
        masked = mask_url(url)
        print(f"\n📡 Disparando redeploy para '{name}' ({masked})...")
        success, status, msg = trigger_webhook(name, url, timeout=args.timeout)
        
        if success:
            print(f"✅ [{name}] Redeploy iniciado com sucesso! (HTTP {status})")
            successes += 1
        else:
            print(f"❌ [{name}] Falha ao disparar redeploy: {msg} (Status: {status})")
            failures += 1

    print("\n" + "=" * 60)
    print(f"📊 RESULTADO DO REDEPLOY: {successes} sucesso(s), {failures} falha(s).")
    print("=" * 60)

    if failures > 0 and successes == 0:
        print("❌ Nenhum webhook pôde ser disparado com sucesso.")
        sys.exit(1)

    print("🎉 Processo de disparo de webhooks concluído com sucesso!")

if __name__ == "__main__":
    main()
