    );
  }

// Contacts Viewer Modal Component (Reusable within Integrations.jsx scope)
const ContactsViewerModal = ({ isOpen, onClose, triggerId, contacts, counts, filter, setFilter, loading, title }) => {
  if (!isOpen) return null;
  const safeContacts = contacts || [];
  const safeCounts = counts || {};

  return createPortal(
    <div className="fixed inset-0 z-[20000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-gray-950 border border-gray-800 rounded-[2rem] w-full max-w-4xl h-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gray-900/50">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <FiMessageSquare className="text-blue-400" />
              Visualização de Contatos: {title || 'Disparo Individual'}
            </h3>
            <p className="text-xs text-gray-400 mt-1">ID do Disparo: {triggerId}</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-all"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="px-6 py-4 flex gap-2 border-b border-white/5 bg-gray-900/30">
          {[
            { id: 'all', label: 'Todos', icon: FiInbox },
            { id: 'sent', label: 'Enviados', icon: FiCheck, count: safeCounts.sent },
            { id: 'delivered', label: 'Interações', icon: FiInbox, count: safeCounts.delivered },
            { id: 'read', label: 'Lidos', icon: FiEye, count: safeCounts.read },
            { id: 'failed', label: 'Falhas', icon: FiXCircle, count: safeCounts.failed },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${filter === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
            >
              <tab.icon size={14} />
              {tab.label}
              {tab.count !== undefined && <span className="opacity-60 text-[10px]">({tab.count})</span>}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-6 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="w-10 h-10 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
              <p className="text-xs font-bold text-gray-500 tracking-widest uppercase">Buscando contatos...</p>
            </div>
          ) : safeContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 italic text-sm">
              Nenhum registro encontrado para este filtro.
            </div>
          ) : (
            <div className="space-y-3">
              {safeContacts.map((contact, idx) => {
                return (
                  <div key={idx} className="bg-white/5 border border-white/5 p-4 rounded-2xl flex items-center justify-between hover:border-white/10 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-xs uppercase">
                        {contact.phone_number?.slice(-2) || 'WA'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{contact.phone_number}</h4>
                          {contact.message_type && (
                            ['FREE_MESSAGE', 'DIRECT_MESSAGE'].includes(contact.message_type) ? (
                              <span className="text-[9px] font-black uppercase bg-cyan-500/10 text-cyan-500 px-1.5 py-0.5 rounded border border-cyan-500/20">
                                Template Grátis
                              </span>
                            ) : (
                              <span className="text-[9px] font-black uppercase bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded border border-orange-500/20">
                                Template Pago
                              </span>
                            )
                          )}
                          {contact.is_interaction && (
                            <span className="text-[9px] font-black uppercase bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/10">
                              Interagiu
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={`text-[10px] font-black uppercase tracking-widest py-0.5 px-2 rounded-lg ${contact.status === 'read' ? 'bg-purple-500/10 text-purple-400' :
                              contact.status === 'delivered' ? 'bg-blue-500/10 text-blue-400' :
                                contact.status === 'sent' ? 'bg-emerald-500/10 text-emerald-400' :
                                  'bg-red-500/10 text-red-500'
                            }`}>
                            {contact.status}
                          </span>

                          {/* AI Memory Status Component */}
                          {contact.memory_webhook_status && (
                            <div
                              className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 group/mem relative cursor-help"
                              title={contact.memory_webhook_error || (contact.memory_webhook_status === 'sent' ? 'Conteúdo salvo na Memória IA' : 'Aguardando processamento')}
                            >
                              <FiCpu size={12} className={
                                contact.memory_webhook_status === 'sent' || contact.memory_webhook_status === 'success' ? 'text-emerald-400 animate-pulse' :
                                  contact.memory_webhook_status === 'failed' ? 'text-red-400' :
                                    'text-gray-500'
                              } />
                              <span className={`text-[9px] font-bold uppercase tracking-tighter ${contact.memory_webhook_status === 'sent' || contact.memory_webhook_status === 'success' ? 'text-emerald-400/80' :
                                  contact.memory_webhook_status === 'failed' ? 'text-red-400/80' :
                                    'text-gray-500/80'
                                }`}>
                                Memória IA
                              </span>
                            </div>
                          )}

                          <span className="text-[10px] text-gray-500 font-mono">
                            {contact.updated_at ? new Date(contact.updated_at).toLocaleString() : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {contact.message_type && (
                        <span className={`text-[10px] font-black uppercase tracking-tight px-2 py-0.5 rounded border transition-all ${contact.message_type === 'TEMPLATE'
                            ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                            : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                          }`}>
                          {contact.message_type === 'TEMPLATE' ? 'Template Pago' : 'Template Grátis'}
                        </span>
                      )}

                      {contact.failure_reason && (
                        <div className="text-[9px] text-red-400 font-bold italic max-w-[150px] text-right leading-tight">
                          {contact.failure_reason}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        }
        </div>
      </div>
    </div>,
    document.body
  );
};
