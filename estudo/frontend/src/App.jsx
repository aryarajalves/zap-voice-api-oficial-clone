import React, { useState } from 'react';

function App() {
    // Estado para guardar a resposta que virá da API
    const [mensagem, setMensagem] = useState('Clique no botão para chamar a API');
    const [loading, setLoading] = useState(false);

    // Função que faz a chamada para o Backend Python
    const chamarSaudacao = async () => {
        setLoading(true);
        try {
            // Fazemos o pedido para a porta que configuramos no Python (9988)
            // Note que aqui não precisamos de proxy se o CORS estiver habilitado no backend
            const response = await fetch('http://localhost:9988/');
            const data = await response.json();

            // Atualizamos o estado com a mensagem que veio do Pydantic (Schema)
            setMensagem(data.mensagem);
        } catch (error) {
            setMensagem('Erro ao conectar com a API. Verifique se o servidor Python está rodando!');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            backgroundColor: '#f0f2f5',
            fontFamily: 'sans-serif'
        }}>
            <div style={{
                padding: '40px',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                textAlign: 'center',
                maxWidth: '400px',
                width: '100%'
            }}>
                <h1 style={{ color: '#333', marginBottom: '8px' }}>ZapVoice Academy</h1>
                <p style={{ color: '#666', marginBottom: '24px' }}>Ambiente de Estudo Isolado</p>

                <div style={{
                    padding: '20px',
                    backgroundColor: '#e8f0fe',
                    borderRadius: '8px',
                    marginBottom: '24px',
                    minHeight: '60px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <p style={{ fontSize: '1.2rem', color: '#1a73e8', fontWeight: 'bold', margin: 0 }}>
                        {mensagem}
                    </p>
                </div>

                <button
                    onClick={chamarSaudacao}
                    disabled={loading}
                    style={{
                        padding: '12px 24px',
                        fontSize: '1rem',
                        backgroundColor: '#25d366',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: cursorState(loading),
                        width: '100%',
                        transition: 'background 0.3s',
                        opacity: loading ? 0.7 : 1
                    }}
                >
                    {loading ? 'Chamando API...' : 'Chamar meu Cérebro Python'}
                </button>
            </div>
        </div>
    );
}

function cursorState(loading) {
    return loading ? 'not-allowed' : 'pointer';
}

export default App;
