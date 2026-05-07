import React from 'react';

const FunnelSettings = ({ logic }) => {
    const { 
        name, setName, 
        description, setDescription, 
        triggerPhrase, setTriggerPhrase, 
        allowedPhone, setAllowedPhone 
    } = logic;

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2">Nome do Funil</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                    placeholder="Ex: Funil de Boas-vindas"
                />
            </div>

            <div>
                <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2">Descrição (Opcional)</label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                    placeholder="Descreva o que este funil faz..."
                    rows={2}
                />
            </div>

            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-md">
                <label className="block text-gray-800 dark:text-yellow-200 font-bold mb-1">⚡ Palavra-chave do Gatilho (Botão)</label>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Inicia automaticamente quando o cliente clicar em um botão com este texto. <b>Separe por vírgulas.</b></p>
                <input
                    type="text"
                    value={triggerPhrase}
                    onChange={(e) => setTriggerPhrase(e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400"
                    placeholder="Ex: Baixar Mapa Astral, Quero Mapa, Sim"
                />
            </div>

            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-md">
                <label className="block text-gray-800 dark:text-red-200 font-bold mb-1">🔒 Restrição de Contato (Opcional)</label>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">SÓ disparado se o contato tiver este número exato (útil para testes ou VIPs).</p>
                <input
                    type="text"
                    value={allowedPhone}
                    onChange={(e) => setAllowedPhone(e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400"
                    placeholder="Ex: 5511999999999"
                />
            </div>
        </div>
    );
};

export default FunnelSettings;
