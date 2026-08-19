# Regra de Deploy e Versionamento (Docker Hub)

Toda vez que uma nova funcionalidade estável for finalizada ou uma correção crítica for aplicada, você deve **perguntar ao usuário** se ele deseja gerar uma nova imagem oficial no Docker Hub para produção.

**Protocolo de Versionamento (Regra do 10):**
1. **Última Versão Criada:** `1.8.1`
2. **Próxima Versão:** `1.8.2`
3. **Lógica de Incremento:** Toda vez que um número chegar a 10, ele deve ser resetado para 0 e somar +1 ao número à esquerda (ex: `3.5.9` -> `3.6.0`).

**Protocolo de Sincronização (Antes do Build):**
1. Atualizar a versão em:
   - `backend/main.py` (Variável `version`)
   - `frontend/package.json` (Campo `version`)
   - `README.md` (Versão)
   - `docker/docker-compose-producao.yml` (Tags das imagens)

**Protocolo de Build e Push:**
1. **Repositório Oficial:** `aryalvesfernandes/zapvoice`
2. **Tags das Imagens:**
   - **Backend:** `aryalvesfernandes/zapvoice:backend-VERSAO`
   - **Worker:** `aryalvesfernandes/zapvoice:worker-VERSAO`
3. **Comandos de Build:**
   - Backend: `docker build -t aryalvesfernandes/zapvoice:backend-1.8.1 -f docker/Dockerfile.api .`
   - Worker: `docker build -t aryalvesfernandes/zapvoice:worker-1.8.1 -f docker/Dockerfile.worker .`
4. **Push:** 
   - `docker push aryalvesfernandes/zapvoice:backend-1.8.1`
   - `docker push aryalvesfernandes/zapvoice:worker-1.8.1`

Isso garante que o ambiente de produção seja sempre rastreável e consistente, utilizando apenas versões fixas.


