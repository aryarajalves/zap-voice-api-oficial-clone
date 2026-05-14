# Regra de Deploy e Versionamento (Docker Hub)

Toda vez que uma nova funcionalidade estável for finalizada ou uma correção crítica for aplicada, você deve **perguntar ao usuário** se ele deseja gerar uma nova imagem oficial no Docker Hub para produção.

**Protocolo de Versionamento (Regra do 10):**
1. **Última Versão Criada:** `3.5.3`
2. **Próxima Versão:** `3.5.4`
3. **Lógica de Incremento:** Toda vez que um número chegar a 10, ele deve ser resetado para 0 e somar +1 ao número à esquerda (ex: `3.5.9` -> `3.6.0`).

**Protocolo de Sincronização (Antes do Build):**
1. Atualizar a versão em:
   - `backend/main.py` (Variável `version`)
   - `frontend/package.json` (Campo `version`)
   - `README.md` (Changelog)
   - `docker/docker-compose-producao.yml` (Tags das imagens)

**Protocolo de Build e Push:**
1. **Repositório Oficial:** `aryarajalves/zap-voice-funil-api-oficial-zap`
2. **Tags das Imagens:**
   - **Backend:** `aryarajalves/zap-voice-funil-api-oficial-zap:backend-VERSAO`
   - **Worker:** `aryarajalves/zap-voice-funil-api-oficial-zap:worker-VERSAO`
3. **Comandos de Build:**
   - Backend: `docker build -t aryarajalves/zap-voice-funil-api-oficial-zap:backend-3.5.4 -f docker/Dockerfile.api .`
   - Worker: `docker build -t aryarajalves/zap-voice-funil-api-oficial-zap:worker-3.5.4 -f docker/Dockerfile.worker .`
4. **Push:** 
   - `docker push aryarajalves/zap-voice-funil-api-oficial-zap:backend-3.5.4`
   - `docker push aryarajalves/zap-voice-funil-api-oficial-zap:worker-3.5.4`

Isso garante que o ambiente de produção seja sempre rastreável e consistente, utilizando apenas versões fixas.


