import React, { useState } from 'react';

const EstudoReact = () => {
    // Estado para guardar a resposta que virá da API
    const [mensagem, setMensagem] = useState('Clique no botão para chamar a API');
    const [loading, setLoading] = useState(false);

    // Função que faz a chamada para o Backend Python
    const chamarSaudacao = async () => {
        setLoading(true);
        try {
            // Fazemos o pedido para a porta que configuramos no Python (9988)
            const response = await fetch('http://localhost:9988/');
            const data = await response.json();

            // Atualizamos o estado com a mensagem que veio do Pydantic (Schema)
            setMensagem(data.mensagem);
        } catch (error) {
            setMensagem('Erro ao conectar com a API. Verifique se o servidor Python está rodando!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f0f2f5',
            fontFamily: 'sans-serif'
        }}>
            <div style={{
                padding: '40px',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                textAlign: 'center'
            }}>
                <h1>Estudo Full Stack</h1>
                <p style={{ fontSize: '1.2rem', color: '#1a73e8', fontWeight: 'bold' }}>
                    {mensagem}
                </p>

                <button
                    onClick={chamarSaudacao}
                    disabled={loading}
                    style={{
                        padding: '12px 24px',
                        fontSize: '1rem',
                        backgroundColor: '#1a73e8',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'background 0.3s'
                    }}
                >
                    {loading ? 'Chamando...' : 'Executar Saudação'}
                </button>
            </div>
        </div>
    );
};

export default EstudoReact;
