import React from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiMessageSquare, FiInbox, FiCheck, FiEye, FiXCircle, FiCpu } from 'react-icons/fi';
import TagContactsModal from './TagContactsModal';

const ContactsViewerModal = ({ isOpen, onClose, triggerId, contacts, counts, filter, setFilter, loading, title, setContactsModal }) => {
  const [selectedPhones, setSelectedPhones] = React.useState([]);
  const [isTagModalOpen, setIsTagModalOpen] = React.useState(false);

  React.useEffect(() => {
    setSelectedPhones([]);
  }, [isOpen, filter]);

  const getContactPhone = (contact) => {
    return contact.phone_number || contact.phone || '';
  };

  const isSelected = (contact) => {
    const phone = getContactPhone(contact);
    return phone ? selectedPhones.includes(phone) : false;
  };

  const toggleSelectOne = (contact) => {
    const phone = getContactPhone(contact);
    if (!phone) return;
    setSelectedPhones(prev => 
      prev.includes(phone) ? prev.filter(p => p !== phone) : [...prev, phone]
    );
  };

  const toggleSelectAll = () => {
    const safeContacts = contacts || [];
    const visiblePhones = safeContacts
      .map(getContactPhone)
      .filter(Boolean);
        
    const allSelected = visiblePhones.length > 0 && visiblePhones.every(phone => selectedPhones.includes(phone));
    
    if (allSelected) {
      setSelectedPhones(prev => prev.filter(p => !visiblePhones.includes(p)));
    } else {
      setSelectedPhones(prev => {
        const newSelected = [...prev];
        visiblePhones.forEach(phone => {
          if (!newSelected.includes(phone)) {
            newSelected.push(phone);
          }
        });
        return newSelected;
      });
    }
  };

  if (!isOpen) return null;
  const safeContacts = contacts || [];
  const safeCounts = counts || {};

  return createPortal(
    <div className="fixed inset-0 z-[20000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#1e293b] border border-white/5 rounded-[2.5rem] w-full max-w-4xl h-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#0f172a]/50">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <FiMessageSquare className="text-blue-400" />
              Visualização de Contatos: {title || 'Disparo Individual'}
            </h3>
            <p className="text-xs text-gray-400 mt-1">ID do Disparo: {triggerId}</p>
          </div>
        </div>

        <div className="px-6 py-4 flex gap-2 border-b border-white/5 bg-[#0f172a]/30">
          {[
            { id: 'all', label: 'Todos', icon: FiInbox },
            { id: 'sent', label: 'Enviados', icon: FiCheck, count: safeCounts.sent },
            { id: 'delivered', label: 'Entregues', icon: FiInbox, count: safeCounts.delivered },
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
            <>
              {safeContacts.length > 0 && (
                <div className="p-3 bg-white/5 border border-white/5 rounded-2xl flex justify-between items-center mb-4 sticky top-0 z-20 backdrop-blur-md">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="rounded border-white/10 bg-transparent text-blue-600 focus:ring-blue-500/20 w-4 h-4 transition-all"
                      checked={safeContacts.length > 0 && safeContacts.every(c => selectedPhones.includes(getContactPhone(c)))}
                      onChange={toggleSelectAll}
                    />
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Selecionar Todos ({safeContacts.length})
                    </span>
                  </label>
                  {selectedPhones.length > 0 && (
                    <button
                      onClick={() => setIsTagModalOpen(true)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-1.5 shadow-md shadow-emerald-950/20 animate-in fade-in zoom-in-95 duration-200"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                      Etiquetar ({selectedPhones.length})
                    </button>
                  )}
                </div>
              )}
              <div className="space-y-3">
                {safeContacts.map((contact, idx) => {
                  return (
                    <div key={idx} className="bg-white/5 border border-white/5 p-4 rounded-2xl flex items-center justify-between hover:border-white/10 transition-all">
                      <div className="flex items-center gap-4">
                        <input
                          type="checkbox"
                          className="rounded border-white/10 bg-transparent text-blue-600 focus:ring-blue-500/20 w-4 h-4 transition-all cursor-pointer"
                          checked={isSelected(contact)}
                          onChange={() => toggleSelectOne(contact)}
                        />
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-xs uppercase">
                          {contact.contact_name ? contact.contact_name.slice(0, 2) : (contact.phone_number?.slice(-2) || 'WA')}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-white">{contact.contact_name || contact.phone_number}</h4>
                            {contact.contact_name && contact.phone_number && (
                              <span className="text-xs text-gray-400 font-mono">({contact.phone_number})</span>
                            )}
                            {contact.lead_tags && (
                              <div className="flex flex-wrap gap-1">
                                {contact.lead_tags.split(',').map(t => t.trim()).filter(Boolean).map((t, tagIdx) => (
                                  <span 
                                    key={tagIdx} 
                                    className="text-[9px] font-black uppercase tracking-tighter bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded border border-emerald-500/20"
                                  >
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}
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

                            {contact.private_note_posted && (
                              <div className="flex items-center justify-center gap-1.5 px-2 py-0.5 rounded-lg bg-pink-500/10 border border-pink-500/20 mt-1 cursor-help" title="Nota privada enviada para o Chatwoot">
                                <span className="text-[9px] font-black uppercase tracking-tighter text-pink-400">Nota Privada</span>
                              </div>
                            )}

                            <span className="text-[10px] text-gray-500 font-mono">
                              {contact.updated_at ? new Date(contact.updated_at).toLocaleString() : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        {contact.chatwoot_url && (
                          <a 
                            href={contact.chatwoot_url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white border border-indigo-700 transition-all text-[10px] font-black uppercase tracking-tight shadow-md shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95"
                            title="Abrir Chat no Chatwoot"
                          >
                            <FiMessageSquare size={12} />
                            Chat
                          </a>
                        )}

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
            </>
          )}
        </div>

        <div className="p-6 border-t border-white/5 bg-[#0f172a] flex justify-end">
          <button
            onClick={onClose}
            className="px-10 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-black uppercase tracking-widest border border-white/10 transition-all active:scale-95"
          >
            Fechar Visualização
          </button>
        </div>
      </div>

      <TagContactsModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        selectedPhones={selectedPhones}
        contacts={contacts}
        setContactsModal={setContactsModal}
        onClearSelection={() => setSelectedPhones([])}
      />
    </div>,
    document.body
  );
};

export default ContactsViewerModal;
