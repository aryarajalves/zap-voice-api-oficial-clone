import React from 'react';

const FUNNEL_NODES = [
  { id: 'messageNode', name: 'Mensagem (Texto)' },
  { id: 'mediaNode', name: 'Mídia (Imagem/Vídeo)' },
  { id: 'audioNode', name: 'Áudio (Gravação de Voz)' },
  { id: 'sendTemplateNode', name: 'Template Meta (Ativo)' },
  { id: 'checkWindowNode', name: 'Verificar Janela 24h' },
  { id: 'delayNode', name: 'Delay (Tempo/Aguardar)' },
  { id: 'waitEventNode', name: 'Aguardar Ação (Conversão)' },
  { id: 'inputDataNode', name: 'Entrada de Dados (Aguardar Resposta)' },
  { id: 'dateNode', name: 'Agendar Data (Calendário)' },
  { id: 'businessHoursNode', name: 'Horário Comercial' },
  { id: 'conditionNode', name: 'Condição (Lógica If/Else)' },
  { id: 'randomizerNode', name: 'Teste A/B (Randomizer)' },
  { id: 'linkFunnelNode', name: 'Conectar Outro Funil' },
  { id: 'httpRequestNode', name: 'Requisição HTTP (Webhook)' },
  { id: 'localSegmentNode', name: 'Segmentação Local (Tag)' },
  { id: 'pixelNode', name: 'Pixel de Conversão (CAPI)' },
  { id: 'crmActionsNode', name: 'Ações de CRM' },
  { id: 'hotLeadsNode', name: 'Leads Quentes' },
  { id: 'rouletteNode', name: 'Roleta / Sorteio' },
];

export default function UserFunnelNodesSection({ userData, setUserData }) {
  return (
    <div>
      <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">
        Restringir Nós do Funil
      </label>
      <div className="space-y-2.5 p-3.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/30 max-h-48 overflow-y-auto custom-scrollbar">
        {FUNNEL_NODES.map(node => {
          const isBlocked = (userData.blocked_nodes || []).includes(node.id);
          return (
            <div key={node.id} className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{node.name}</span>
              <button
                type="button"
                onClick={() => {
                  const currentBlocked = userData.blocked_nodes || [];
                  const isNowBlocked = currentBlocked.includes(node.id);
                  const newBlocked = isNowBlocked
                    ? currentBlocked.filter(x => x !== node.id)
                    : [...currentBlocked, node.id];
                  setUserData({ ...userData, blocked_nodes: newBlocked });
                }}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isBlocked ? 'bg-red-500/80' : 'bg-green-500'}`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isBlocked ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>
          );
        })}
      </div>
      <p className="mt-1.5 text-[10px] text-gray-400 italic">
        Os nós com o interruptor vermelho estarão bloqueados/ocultos para este usuário.
      </p>
    </div>
  );
}
