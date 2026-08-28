import os
import yaml
import pytest

def test_production_docker_compose_security_ports():
    """
    Testa se o docker-compose-producao.yml não expõe portas públicas diretamente no host,
    garantindo que todo o tráfego passe exclusivamente pelo Traefik SSL.
    """
    compose_path = os.path.join(os.path.dirname(__file__), "..", "..", "docker", "docker-compose-producao.yml")
    assert os.path.exists(compose_path), f"Arquivo de produção não encontrado em: {compose_path}"

    with open(compose_path, "r", encoding="utf-8") as f:
        compose_data = yaml.safe_load(f)

    services = compose_data.get("services", {})
    assert "zapvoice_app" in services

    app_service = services["zapvoice_app"]
    
    # Valida que ports não está exposto para o host
    assert "ports" not in app_service, "zapvoice_app em produção não deve mapear 'ports:' no host; deve usar exclusivamente a rede do Traefik."

    # Valida que os labels do Traefik estão configurados corretamente
    deploy_labels = app_service.get("deploy", {}).get("labels", [])
    labels_text = " ".join(deploy_labels)
    assert "traefik.enable=true" in labels_text
    assert "websecure" in labels_text
    assert "traefik.docker.network=network_swarm_public" in labels_text

def test_production_docker_compose_no_hardcoded_env_file():
    """
    Testa se o docker-compose-producao.yml não depende de env_file físico (ex: ../backend/.env),
    o que causaria erro ao clonar repositórios limpos no Portainer/CI-CD.
    """
    compose_path = os.path.join(os.path.dirname(__file__), "..", "..", "docker", "docker-compose-producao.yml")
    with open(compose_path, "r", encoding="utf-8") as f:
        compose_data = yaml.safe_load(f)

    services = compose_data.get("services", {})
    for s_name, service in services.items():
        assert "env_file" not in service, f"Serviço {s_name} não deve usar 'env_file:' no compose de produção para evitar falha ao clonar via Portainer/Git."
        assert "environment" in service, f"Serviço {s_name} deve utilizar o bloco 'environment:' para receber variáveis de ambiente."

    networks = compose_data.get("networks", {})
    assert "network_swarm_public" in networks, "A rede network_swarm_public deve estar declarada no compose de produção."
    assert networks["network_swarm_public"].get("external") is True, "A rede network_swarm_public deve ser externa."

