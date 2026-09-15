# Regra de Modo de Operação (Modo Rápido vs Modo Completo)

Para garantir máxima agilidade no desenvolvimento sem burocracia ou esperas longas desnecessárias, estabelecemos a distinção clara entre os modos de operação:

## 1. Pergunta Obrigatória ao Iniciar Nova Tarefa
Toda vez que o usuário solicitar a criação ou alteração de uma funcionalidade nova e **não tiver especificado** explicitamente na mensagem se deseja o "Modo Rápido", o agente **DEVE obrigatoriamente perguntar** no início antes de qualquer execução pesada:
> "Você prefere seguir pelo **Modo Rápido** (foco em codificar e rodar apenas os testes unitários para validar se houve bugs) ou pelo **Modo Completo** (com validação visual, recriação docker e documentação)?"

Caso o usuário responda ou já mencione "Modo Rápido", "rápido" ou "apenas suba a atualização":
- O agente adota imediatamente o **Modo Rápido**.

## 2. Diretrizes do Modo Rápido ⚡
Quando o Modo Rápido estiver ativo:
1. **Foco Estrito em Código e Testes Unitários:**
   - O agente codifica a solução de forma limpa e direta.
   - Cria e/ou atualiza os testes unitários (`pytest` no backend e `vitest` no frontend) para assegurar que a funcionalidade está operando e que nenhum bug foi introduzido.
2. **Dispensa de Burocracias e Processos Pesados:**
   - **NÃO** interrompe para criar planos de implementação extensos.
   - **NÃO** executa recriação forçada de contêineres Docker (`--force-recreate`) a cada turno, poupando minutos de espera de I/O.
   - **NÃO** executa gravações ou prints visuais com browser a menos que o usuário peça explicitamente.
3. **Validação Rápida:**
   - O agente apenas roda os testes unitários da alteração e relata o resultado de forma concisa e rápida.

Isso garante que o usuário tenha suas entregas em segundos/minutos, mantendo a estabilidade do código através dos testes unitários.
