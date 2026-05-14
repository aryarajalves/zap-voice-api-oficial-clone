import React from 'react';
import { FiTrash2, FiPlay, FiCopy, FiEdit2, FiMaximize2, FiZap, FiRefreshCw, FiSettings, FiCheckCircle, FiXCircle } from 'react-icons/fi';

const HistoryItemCard = ({
  item,
  selectedHistoryIds,
  handleToggleSelect,
  handleResendWebhook,
  isResending,
  setConfirmDeleteHistory,
  toast,
  setEditJsonModal,
  setMaximizedJson,
  handleSyncHistory,
  isSyncing
}) => {
  return (
    <div className="group relative border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden bg-white dark:bg-[#1e293b]/40 hover:scale-[1.015] transition-all duration-300 hover:border-blue-500/50 dark:hover:border-blue-600/50 hover:shadow-2xl dark:hover:shadow-blue-900/10">
      <div className="p-5 flex justify-between items-center bg-gray-50/50 dark:bg-[#0f172a]/40 border-b border-gray-200 dark:border-white/5">
        <div className="flex items-center gap-5">
          <input
            type="checkbox"
            className="w-5 h-5 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-all active:scale-90"
            checked={selectedHistoryIds.includes(item?.id)}
            onChange={() => handleToggleSelect(item?.id)}
          />
          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${item.status === 'processed' ? 'bg-green-100 text-green-700 dark:bg-green-400/10 dark:text-green-400' :
              item.status === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-400/10 dark:text-red-400' :
                'bg-gray-100 text-gray-700 dark:bg-gray-400/10 dark:text-gray-400'
            }`}>
            {item.status}
          </span>
          <span className="text-xs text-gray-500 font-mono font-medium">
            {new Date(item.created_at).toLocaleString()}
          </span>
          <span className="px-3 py-1 bg-blue-50 dark:bg-blue-400/5 rounded-full text-xs font-bold text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-400/10">
            {item.event_type || 'Evento não detectado'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleResendWebhook(item.id)}
            disabled={isResending}
            className="text-[11px] font-black bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-500/20 uppercase tracking-wider"
          >
            <FiPlay size={11} fill="currentColor" /> Reenviar
          </button>
          <button
            onClick={() => setConfirmDeleteHistory({ isOpen: true, type: 'single', id: item.id })}
            className="p-2.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all active:scale-90"
            title="Excluir Registro"
          >
            <FiTrash2 size={16} />
          </button>
        </div>
      </div>

      <div className="p-6 overflow-hidden">
        <div className="flex justify-between items-center mb-3">
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600"></div>
            Payload Recebido
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(item.payload, null, 2));
                toast.success("JSON copiado!");
              }}
              className="text-[10px] font-bold bg-white dark:bg-[#1e293b] hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-lg transition-all border border-gray-200 dark:border-white/5 flex items-center gap-1.5 active:scale-95"
            >
              <FiCopy size={11} /> Copiar
            </button>
            <button
              onClick={() => setEditJsonModal({ isOpen: true, data: JSON.stringify(item.payload, null, 2), id: item.id })}
              className="text-[10px] font-bold bg-white dark:bg-[#1e293b] hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-lg transition-all border border-blue-200 dark:border-blue-800/50 flex items-center gap-1.5 active:scale-95 shadow-sm shadow-blue-500/5"
            >
              <FiEdit2 size={11} /> Editar JSON
            </button>
            <button
              onClick={() => setMaximizedJson(item.payload)}
              className="text-[10px] font-bold bg-white dark:bg-[#1e293b] hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-lg transition-all border border-gray-200 dark:border-white/5 flex items-center gap-1.5 active:scale-95"
            >
              <FiMaximize2 size={11} /> Maximizar
            </button>
          </div>
        </div>

        <pre className="text-[11px] font-mono p-4 bg-[#0b1120] text-white rounded-xl overflow-auto max-h-60 border border-white/5 scrollbar-thin scrollbar-thumb-white/10 dark:text-white shadow-inner">
          {JSON.stringify(item.payload, null, 2)}
        </pre>

        {item.processed_data && (
          <div className="mt-5 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-2xl border border-blue-100/50 dark:border-blue-800/20 shadow-sm relative overflow-hidden group/data">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] dark:opacity-[0.05] pointer-events-none group-hover/data:scale-110 transition-transform duration-700">
              <FiZap size={120} className="text-blue-600" />
            </div>
            <div className="text-[10px] text-blue-600 dark:text-blue-400 font-black uppercase mb-4 flex items-center justify-between tracking-widest relative z-10">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
                Dados extraídos pelo Sistema
              </div>
              <button
                onClick={() => handleSyncHistory(item.id)}
                disabled={isSyncing[item.id]}
                className="text-[10px] bg-white dark:bg-[#1e293b] border border-blue-200 dark:border-blue-800/50 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                title="Re-processar extração com as regras atuais"
              >
                <FiRefreshCw size={10} className={isSyncing[item.id] ? 'animate-spin' : ''} />
                {isSyncing[item.id] ? 'Sincronizando...' : 'Sincronizar Dados'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-[12px] relative z-10">
              <div className="flex justify-between border-b border-blue-200/30 dark:border-blue-700/20 pb-1.5">
                <span className="text-gray-400 dark:text-gray-400 font-medium">Plataforma:</span>
                <span className="font-bold text-blue-400 dark:text-blue-400 capitalize">{item.processed_data.platform || '-'}</span>
              </div>
              <div className="flex justify-between border-b border-blue-200/30 dark:border-blue-700/20 pb-1.5">
                <span className="text-gray-400 dark:text-gray-400 font-medium">Nome:</span>
                <span className="font-bold text-white dark:text-white">{item.processed_data.name || '-'}</span>
              </div>
              <div className="flex justify-between border-b border-blue-200/30 dark:border-blue-700/20 pb-1.5">
                <span className="text-gray-500 dark:text-gray-500 font-medium">Telefone:</span>
                <span className="font-bold text-gray-800 dark:text-gray-200 tracking-tight">{item.processed_data.phone || '-'}</span>
              </div>
              <div className="flex justify-between border-b border-blue-200/30 dark:border-blue-700/20 pb-1.5">
                <span className="text-gray-500 dark:text-gray-500 font-medium">E-mail:</span>
                <span className="font-bold text-gray-800 dark:text-gray-200 lowercase">{item.processed_data.email || '-'}</span>
              </div>
              <div className="flex justify-between border-b border-blue-200/30 dark:border-blue-700/20 pb-1.5 md:col-span-2">
                <span className="text-gray-400 dark:text-gray-400 font-medium whitespace-nowrap">Produtos:</span>
                <div className="flex flex-col items-end gap-1.5 w-full pl-8">
                  {item.processed_data.items && item.processed_data.items.length > 0 ? (
                    item.processed_data.items.map((prod, idx) => (
                      <div key={idx} className="flex justify-between w-full text-[11px] bg-blue-500/5 px-2 py-1 rounded border border-blue-500/10">
                        <span className="text-gray-300 truncate mr-2">{prod.name}</span>
                        <span className="text-blue-400 font-bold whitespace-nowrap">R$ {prod.price || '0'}</span>
                      </div>
                    ))
                  ) : (
                    <span className="font-bold text-blue-400 text-right">{item.processed_data.product_name || '-'}</span>
                  )}
                </div>
              </div>
              {item.processed_data.e_order_bump && (
                <div className="flex justify-between border-b border-orange-200/30 dark:border-orange-700/20 pb-1.5 md:col-span-2 bg-orange-500/5 px-2 rounded-sm">
                  <span className="text-orange-600 dark:text-orange-400 font-bold flex items-center gap-1.5">
                    <FiZap size={12} /> Order Bump Detectado!
                  </span>
                  <span className="font-medium text-orange-500 text-[10px] uppercase tracking-tighter self-center">Venda Casada</span>
                </div>
              )}
              {item.processed_data?.items_detailed && (
                <div className="flex flex-col gap-1.5 md:col-span-2 bg-gray-50 dark:bg-[#0b1120]/50 p-3 rounded-lg border border-gray-100 dark:border-white/5 mt-1">
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-widest mb-1">Itens do Pedido</span>
                  {item.processed_data.items_detailed.map((prod, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[11px] pb-1 border-b border-gray-100 dark:border-gray-800 last:border-0 last:pb-0">
                      <span className="text-gray-700 dark:text-gray-300 font-medium">
                        {typeof prod === 'object' ? (prod.name || 'Produto') : (String(prod).split(' - ')[0] || 'Produto')}
                      </span>
                      <span className="text-blue-500 dark:text-blue-400 font-bold ml-4">
                        {typeof prod === 'object' ? (prod.price || '0') : (String(prod).split(' - ')[1] || '0')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between border-b border-blue-200/30 dark:border-blue-700/20 pb-1.5">
                <span className="text-gray-400 dark:text-gray-400 font-medium">Método:</span>
                <span className="font-bold text-white dark:text-white capitalize">{item.processed_data.payment_method || '-'}</span>
              </div>
              <div className="flex justify-between border-b border-blue-200/30 dark:border-blue-700/20 pb-1.5">
                <span className="text-gray-400 dark:text-gray-400 font-medium">Valor:</span>
                <span className="font-bold text-green-400 dark:text-green-400">
                  {item.processed_data.price ? `R$ ${item.processed_data.price}` : 'R$ -'}
                </span>
              </div>
              <div className="flex justify-between border-b border-blue-200/30 dark:border-blue-700/20 pb-1.5 md:col-span-2">
                <span className="text-gray-400 dark:text-gray-400 font-medium whitespace-nowrap">Status Principal:</span>
                <span className={`font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${item.processed_data.raw_status?.includes('Aprovada') ? 'text-green-500 bg-green-500/10' :
                    item.processed_data.raw_status?.includes('Expirado') ? 'text-orange-500 bg-orange-500/10' :
                      'text-blue-500 bg-blue-500/10'
                  }`}>
                  {item.processed_data.raw_status || '-'}
                </span>
              </div>

              {/* --- Status ManyChat Integration --- */}
              {item.processed_data?.manychat_enabled && (
                <div className="mt-4 p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl relative overflow-hidden group/mc">
                  <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none group-hover/mc:scale-110 transition-transform duration-700">
                    <FiZap size={60} className="text-indigo-400" />
                  </div>
                  <div className="text-[10px] text-indigo-400 font-black uppercase mb-3 flex items-center justify-between tracking-widest relative z-10">
                    <div className="flex items-center gap-2">
                      <span className={`flex h-2 w-2 rounded-full ${
                        item.processed_data.manychat_sync?.status === 'success' ? 'bg-green-500' : 
                        item.processed_data.manychat_sync?.status === 'failed' ? 'bg-red-500' : 'bg-orange-500'
                      } animate-pulse`}></span>
                      Integração ManyChat
                    </div>
                    <span className="text-[9px] opacity-60">Status: {item.processed_data.manychat_sync?.status || 'Pendente'}</span>
                  </div>

                  {item.processed_data.manychat_sync ? (
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[11px] relative z-10">
                      <div className="flex justify-between border-b border-indigo-500/10 pb-1">
                        <span className="text-gray-400">Contato:</span>
                        <span className={`font-bold ${item.processed_data.manychat_sync.contact?.status === 'created' ? 'text-green-400' : 'text-indigo-300'}`}>
                          {item.processed_data.manychat_sync.contact?.status === 'created' ? '✅ Criado' : 
                           item.processed_data.manychat_sync.contact?.status === 'existed' ? '🔍 Localizado' : '❌ Falhou'}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-indigo-500/10 pb-1">
                        <span className="text-gray-400">Etiqueta:</span>
                        <span className={`font-bold ${item.processed_data.manychat_sync.tag?.status === 'applied' ? 'text-green-400' : 'text-orange-400'}`}>
                          {item.processed_data.manychat_sync.tag?.status === 'applied' ? '🏷️ Vinculada' : '⚠️ Pendente'}
                        </span>
                      </div>
                      <div className="flex justify-between md:col-span-2 pt-1">
                        <span className="text-gray-500">Etiqueta aplicada:</span>
                        <span className="font-mono text-indigo-400 bg-indigo-500/5 px-1.5 py-0.5 rounded text-[10px]">
                          {item.processed_data.manychat_sync.tag?.name || '-'}
                        </span>
                      </div>
                      {item.processed_data.manychat_sync.error && (
                        <div className="md:col-span-2 mt-1 p-2 bg-red-500/5 border border-red-500/10 rounded-lg text-red-400 text-[10px]">
                          <strong>Erro:</strong> {item.processed_data.manychat_sync.error}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-[11px] text-gray-500 italic py-2">
                      Aguardando sincronização com o ManyChat...
                    </div>
                  )}
                </div>
              )}

              {/* --- Chatwoot Integrations --- */}
              {(item.processed_data?.private_note_enabled || (item.processed_data?.chatwoot_label && (Array.isArray(item.processed_data.chatwoot_label) ? item.processed_data.chatwoot_label.length > 0 : String(item.processed_data.chatwoot_label).length > 0)) || (item.processed_data?.free_message_enabled && (item.template_name || item.funnel_id))) && (
                <div className="mt-4 p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl relative overflow-hidden group/cw">
                  <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none group-hover/cw:scale-110 transition-transform duration-700">
                    <FiSettings size={60} className="text-blue-400" />
                  </div>
                  <div className="text-[10px] text-blue-400 font-black uppercase mb-3 flex items-center justify-between tracking-widest relative z-10">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2 w-2 rounded-full bg-blue-500"></span>
                      Integrações Chatwoot
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-[11px] relative z-10">
                    {item.processed_data.private_note_enabled && (
                      <div className="flex justify-between items-center border-b border-blue-500/10 pb-1">
                        <span className="text-gray-400">Nota Privada:</span>
                        <span className="font-bold text-green-400 flex items-center gap-1">
                          <FiCheckCircle size={10} /> Ativa
                        </span>
                      </div>
                    )}
                    {item.processed_data.free_message_enabled && (
                      <div className="flex justify-between items-center border-b border-blue-500/10 pb-1">
                        <span className="text-gray-400">Mensagem Livre:</span>
                        <span className="font-bold text-indigo-400">Sessão Ativa</span>
                      </div>
                    )}
                    {(item.processed_data.chatwoot_label && (Array.isArray(item.processed_data.chatwoot_label) ? item.processed_data.chatwoot_label.length > 0 : String(item.processed_data.chatwoot_label).length > 0)) && (
                      <div className="md:col-span-2 pt-1">
                        <span className="text-gray-500 block mb-1.5 uppercase text-[9px] font-black tracking-widest opacity-60">Etiquetas Aplicadas:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {(() => {
                            let labels = [];
                            const raw = item.processed_data.chatwoot_label;
                            if (Array.isArray(raw)) {
                              labels = raw;
                            } else if (typeof raw === 'string') {
                              let clean = raw.trim();
                              if (clean.startsWith('[') && clean.endsWith(']')) {
                                clean = clean.substring(1, clean.length - 1);
                              }
                              labels = clean.split(',').map(l => l.replace(/["']/g, '').trim()).filter(Boolean);
                            }
                            return labels.map((label, i) => (
                              <span key={i} className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-lg text-[10px] font-black">
                                {label}
                              </span>
                            ));
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* --- Campos Extras Extraídos --- */}
              {item.processed_data?.custom_fields && Object.keys(item.processed_data.custom_fields).length > 0 && (
                <div className="mt-2 md:col-span-2 bg-purple-500/5 border border-purple-500/10 p-3 rounded-xl relative overflow-hidden">
                  <div className="text-[10px] text-purple-600 dark:text-purple-400 font-black uppercase mb-3 flex items-center gap-1.5 tracking-widest relative z-10">
                    <FiSettings size={12} />
                    Campos Personalizados (Extras)
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 relative z-10 text-[11px]">
                    {Object.entries(item.processed_data.custom_fields).map(([k, v]) => (
                      <div key={k} className="flex justify-between border-b border-purple-200/20 dark:border-purple-700/20 pb-1 break-all">
                        <span className="text-gray-500 dark:text-gray-400 font-medium pr-2 max-w-[50%] truncate shrink-0" title={k}>{k}:</span>
                        <span className="font-bold text-gray-800 dark:text-gray-200 text-right shrink min-w-0" title={v}>{String(v) || '-'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {item.processed_data.utm_source && (
                <div className="flex justify-between border-b border-blue-200/30 dark:border-blue-700/20 pb-1.5 md:col-span-2">
                  <span className="text-gray-500 dark:text-gray-500 font-medium">Origem (UTM):</span>
                  <span className="font-bold text-indigo-500 dark:text-indigo-400">
                    {item.processed_data.utm_source} {item.processed_data.utm_medium ? `(${item.processed_data.utm_medium})` : ''}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
        {item.error_message && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-400/5 rounded-xl border border-red-100 dark:border-red-400/20 text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-2">
            <FiXCircle size={14} /> <strong>Erro:</strong> {item.error_message}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryItemCard;
