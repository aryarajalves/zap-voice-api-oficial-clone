from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from typing import List, Optional

# --- 1. SCHEMAS (Modelos de Dados) ---
# Em projetos profissionais, definimos EXATAMENTE o que a API responde.

class SomaResposta(BaseModel):
    num_a: int
    num_b: int
    resultado: int
    mensagem: Optional[str] = "Cálculo realizado com sucesso"

class SaudacaoResposta(BaseModel):
    mensagem: str
    versao: str

# --- 2. INSTÂNCIA COM METADADOS ---
app = FastAPI(
    title="ZapVoice Academy - API de Estudo",
    description="API criada para aprender os fundamentos de FastAPI, Decorators e Pydantic.",
    version="1.0.0",
    docs_url="/documentacao",
)

# LIBERANDO O ACESSO (CORS) para o React conseguir conversar com o Python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 3. ROTAS PROFISSIONAIS ---

@app.get(
    "/", 
    response_model=SaudacaoResposta,
    summary="Boas-vindas",
    tags=["Core"]
)
async def saudacao():
    return {
        "mensagem": "Bem-vindo ao nível profissional!",
        "versao": app.version
    }

@app.get(
    "/somar",
    response_model=SomaResposta,
    summary="Operação de Soma",
    description="Soma dois números inteiros e retorna um objeto estruturado.",
    tags=["Operações"]
)
async def somar(a: int, b: int):
    resultado = a + b
    return SomaResposta(
        num_a=a,
        num_b=b,
        resultado=resultado
    )

# --- 4. EXECUÇÃO ---
if __name__ == "__main__":
    print(f"🚀 {app.title} iniciando...")
    uvicorn.run("api_teste:app", host="0.0.0.0", port=9988, reload=True)
