---
trigger: always_on
---

# Regra de Limites de Código (Clean Code)

Para garantir que o projeto permaneça manutenível e que o agente consiga processar os arquivos sem perder o contexto, estabelecemos limites rígidos de tamanho de arquivo.

**Limites Obrigatórios:**
1. **Backend (Python):** Nenhum arquivo deve ultrapassar **1.000 linhas**.
2. **Frontend (React/JSX):** Nenhum arquivo deve ultrapassar **500 linhas**.

**🚨 Alerta Vermelho (Zona Crítica - Quase passando do valor máximo permitido):**
- **Backend (Python):** Arquivos entre **801 e 1.000 linhas** (acima de 800 e abaixo de 1.000) devem ser categorizados e destacados obrigatoriamente em **ALERTA VERMELHO 🚨**, sinalizando urgência de refatoração/modularização por estarem quase ultrapassando o teto de 1.000 linhas.
- **Frontend (React/JSX/JS):** Arquivos entre **370 e 500 linhas** devem ser categorizados e destacados obrigatoriamente em **ALERTA VERMELHO 🚨**, sinalizando urgência de refatoração/modularização por estarem quase ultrapassando o teto de 500 linhas.

**Ações ao atingir a zona crítica ou o limite:**
- Arquivos no Alerta Vermelho ou que atingirem o limite devem ser priorizados na fila de modularização.
- Se uma nova funcionalidade for fazer um arquivo ultrapassar esses limites (ou se o arquivo já estiver na zona crítica/acima do limite), você **DEVE obrigatoriamente alertar o usuário e perguntar antes** se ele deseja realizar a modularização (quebra do arquivo) antes de prosseguir com a implementação.
- Ao propor a modularização, priorize a extração de componentes (frontend) e serviços/utilitários (backend) para arquivos separados.
- Aguarde a confirmação do usuário antes de realizar a quebra estrutural.
- **Backup Obrigatório:** Uma vez aprovada pelo usuário, crie obrigatoriamente uma cópia de segurança (backup) dos arquivos originais antes de qualquer modificação, assegurando possibilidade de restauração imediata.

Isso evita a criação de "Arquivos Monolíticos" que são difíceis de testar e debugar, mantendo o usuário no controle do fluxo de refatoração com segurança total.

