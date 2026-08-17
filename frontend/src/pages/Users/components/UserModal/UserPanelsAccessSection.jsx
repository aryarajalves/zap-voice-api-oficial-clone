import React from 'react';

const PAGES_CONFIG = [
  { cat: 'Campanhas' },
  { id: 'bulk_sender',          name: 'Disparo em Massa',        blockable: false },
  { id: 'recurring_schedules',  name: 'Disparo Recorrente',      blockable: true,  blockId: 'schedules' },
  { id: 'schedules',            name: 'Agenda de Disparos',      blockable: true,  blockId: 'schedules' },
  { id: 'history',              name: 'Histórico de Disparos',   blockable: false },
  { cat: 'Vendas' },
  { id: 'hot_leads',            name: 'Leads Quentes',           blockable: false },
  { cat: 'Automação' },
  { id: 'whatsapp',             name: 'Templates do WhatsApp',   blockable: true,  blockId: 'whatsapp' },
  { id: 'funnels',              name: 'Funis de Vendas',         blockable: true,  blockId: 'funnels' },
  { id: 'integrations',         name: 'Integrações Webhook',     blockable: true,  blockId: 'settings' },
  { id: 'instagram_automation', name: 'Automação Instagram',     blockable: false },
  { cat: 'Contatos' },
  { id: 'leads',                name: 'Contatos',                blockable: true,  blockId: 'leads' },
  { id: 'import_history',       name: 'Histórico de Importação', blockable: true,  blockId: 'leads' },
  { id: 'blocked',              name: 'Contatos Bloqueados',     blockable: true,  blockId: 'leads' },
  { cat: 'Administração' },
  { id: 'financial',            name: 'Financeiro',              blockable: false },
];

export default function UserPanelsAccessSection({ userData, setUserData }) {
  return (
    <div>
      <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">
        Painéis e Status de Construção
      </label>
      <div className="space-y-0 p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/30 max-h-80 overflow-y-auto custom-scrollbar">
        {PAGES_CONFIG.map((page, idx) => {
          if (page.cat) {
            return (
              <div key={`cat-${page.cat}`} className={`pt-${idx === 0 ? '0' : '2'} pb-0.5`}>
                <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{page.cat}</span>
                <div className="h-px bg-gray-200 dark:bg-gray-700 mt-0.5 mb-1" />
              </div>
            );
          }
          const blockKey = page.blockId || page.id;
          const isBlocked = page.blockable && (userData.blocked_features || []).includes(blockKey);
          const ps = (userData.pages_status || {})[page.id] || {};
          const isBuilt = ps.built !== false;
          const pct = ps.percentage ?? (isBuilt ? 100 : 0);

          const toggleBlock = () => {
            const curr = userData.blocked_features || [];
            const nowBlocked = curr.includes(blockKey);
            setUserData({
              ...userData,
              blocked_features: nowBlocked ? curr.filter(x => x !== blockKey) : [...curr, blockKey]
            });
          };

          const setBuilt = (val) => {
            const curr = userData.pages_status || {};
            setUserData({
              ...userData,
              pages_status: {
                ...curr,
                [page.id]: {
                  ...curr[page.id],
                  built: val,
                  percentage: val ? 100 : (curr[page.id]?.percentage ?? 0)
                }
              }
            });
          };

          const setPct = (val) => {
            const curr = userData.pages_status || {};
            setUserData({
              ...userData,
              pages_status: {
                ...curr,
                [page.id]: {
                  ...curr[page.id],
                  percentage: val
                }
              }
            });
          };

          return (
            <div key={page.id} className="rounded-lg overflow-hidden">
              <div className="flex items-center justify-between py-2 px-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isBlocked ? 'bg-red-400' : isBuilt ? 'bg-green-400' : 'bg-yellow-400'}`} />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{page.name}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  {page.blockable && (
                    <button
                      type="button"
                      title={isBlocked ? 'Bloqueado — clique para liberar' : 'Liberado — clique para bloquear'}
                      onClick={toggleBlock}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isBlocked ? 'bg-red-500/80' : 'bg-green-500'}`}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isBlocked ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  )}
                  {!page.blockable && (
                    <span className="text-[9px] font-bold text-gray-400 uppercase">sempre ativo</span>
                  )}
                </div>
              </div>

              {!isBlocked && (
                <div className="ml-4 pl-3 pb-2 border-l-2 border-gray-200 dark:border-gray-600 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">Já construída?</span>
                    <button
                      type="button"
                      onClick={() => setBuilt(!isBuilt)}
                      className={`relative inline-flex h-4 w-8 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isBuilt ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                    >
                      <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isBuilt ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {!isBuilt && (
                    <div className="space-y-1 pr-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-400">Progresso</span>
                        <span className="text-[10px] font-bold text-blue-600">{pct}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={pct}
                        onChange={(e) => setPct(Number(e.target.value))}
                        className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                        <div className="bg-blue-600 h-1 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-1.5 text-[10px] text-gray-400 italic">
        🔴 bloqueado &nbsp;·&nbsp; 🟡 em construção &nbsp;·&nbsp; 🟢 ativo e construído
      </p>
    </div>
  );
}
