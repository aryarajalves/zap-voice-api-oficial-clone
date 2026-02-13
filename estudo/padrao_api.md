# Padrão de Criação de APIs - ZapVoice

Sempre que for me pedir para criar uma nova API (rota), utilize este documento como referência de qualidade.

## Estrutura Obrigatória do Decorator

Toda rota deve conter os seguintes campos no decorator `@app.metodo`:

1.  **`summary`**: Um título curto e direto do que a rota faz.
2.  **`description`**: Explicação detalhada usando Markdown (especificando requisitos e lógica).
3.  **`response_description`**: O que o usuário deve esperar receber de volta.
4.  **`tags`**: Uma lista para organizar a rota no Swagger (ex: `["WhatsApp"]`, `["Usuários"]`).

## Exemplo de Código Base

```python
@app.get(
    "/exemplo",
    summary="Título da Rota",
    description="""
    Descrição detalhada em Markdown.
    - **item**: detalhe
    """,
    response_description="Descrição do retorno",
    tags=["Categoria"]
)
async def minha_funcao(parametro: int):
    return {"resultado": parametro}
```

## Regras de Tipagem
- Sempre use **Type Hints** (ex: `nome: str`, `quantidade: int`).
- Use **async def** para funções assíncronas.
