---
trigger: always_on
---

# Regra de Modularização e Arquitetura

Ao realizar refatorações ou expansões do sistema, a organização de arquivos deve seguir um padrão modular para evitar o acúmulo de lógica em arquivos únicos.

**Diretrizes de Modularização:**
0. **Backup Obrigatório Pré-Refatoração:** Antes de iniciar qualquer refatoração, quebra de arquivo ou modularização, o agente DEVE obrigatoriamente criar uma cópia de backup do(s) arquivo(s) original(is) intacto(s) (ou garantir ponto de restauração seguro/backup em pasta dedicada), garantindo rollback imediato em caso de qualquer imprevisto.
1. **Pontos de Entrada (Barrels):** Ao quebrar um arquivo grande em uma pasta, mantenha um arquivo `index.jsx` (ou `__init__.py`) que atue como o exportador principal, mantendo a compatibilidade com os imports existentes no restante do projeto.
2. **Separação de Preocupações:**
   - **Frontend:** Separe a lógica de estado (Hooks customizados), a renderização (Componentes) e os utilitários em arquivos distintos.
   - **Backend:** Separe as rotas (Routers), os modelos de dados (Schemas/Models) e a lógica de negócio (Services).
3. **Proibição de Componentes Aninhados:** Não defina sub-componentes dentro do mesmo arquivo se eles possuírem lógica complexa ou mais de 50 linhas de código. Extraia para a pasta `components/`.
4. **Descarte do Backup:** O backup só pode ser removido após validação completa com testes unitários, reinício dos containers e confirmação explícita de funcionamento.
5. **Relatório de Códigos Restantes:** Sempre que concluir a modularização de um arquivo, o agente DEVE obrigatoriamente apresentar na resposta final a lista atualizada dos próximos códigos que ainda precisam ser modularizados, destacando em **ALERTA VERMELHO 🚨** os arquivos na zona crítica (quase passando do limite permitido):
   - **Backend:** Arquivos entre **801 e 1.000 linhas** (acima de 800 e abaixo de 1.000).
   - **Frontend:** Arquivos entre **370 e 500 linhas**.
   Mantendo o usuário informado com transparência sobre o progresso geral.
6. **Exclusão de Arquivos de Teste:** Arquivos de testes (ex: `*.test.jsx`, `*.test.js`, `*.spec.jsx`, `test_*.py` ou diretórios `tests_unit/`, `tests/`) **NÃO** entram em refatoração ou modularização e **NÃO** devem ser incluídos nos relatórios de zona crítica. Arquivos de teste contêm múltiplos cenários, mocks e asserts que justificam tamanhos maiores e devem ser preservados sem quebra estrutural desnecessária.

Isso mantém a base de código limpa, escalável, fácil de navegar e 100% segura contra perda acidental de lógica.
