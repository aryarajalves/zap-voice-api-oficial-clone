import React from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiMessageSquare, FiInbox, FiCheck, FiEye, FiXCircle, FiCpu } from 'react-icons/fi';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';
import { useClient } from '../../../contexts/ClientContext';
import { toast } from 'react-hot-toast';

const ContactsViewerModal = ({ isOpen, onClose, triggerId, contacts, counts, filter, setFilter, loading, title }) => {
  const { activeClient } = useClient();

  const [selectedPhones, setSelectedPhones] = React.useState([]);
  const [isTagModalOpen, setIsTagModalOpen] = React.useState(false);
  const [tagInput, setTagInput] = React.useState('');
  const [availableTags, setAvailableTags] = React.useState([]);
  const [isLoadingTags, setIsLoadingTags] = React.useState(false);
  const [isSavingLeads, setIsSavingLeads] = React.useState(false);
  const [isTagsDropdownOpen, setIsTagsDropdownOpen] = React.useState(false);
  const [tagsSearch, setTagsSearch] = React.useState('');

  React.useEffect(() => {
    setSelectedPhones([]);
  }, [isOpen, filter]);

  const fetchTags = async () => {
    if (!activeClient) return;
    setIsLoadingTags(true);
    try {
      const [resLeads, resChatwoot] = await Promise.all([
        fetchWithAuth(`${API_URL}/leads/filters`, {}, activeClient.id),
        fetchWithAuth(`${API_URL}/chatwoot/labels`, {}, activeClient.id).catch(() => null)
      ]);
      let leadsTags = [];
      if (resLeads && resLeads.ok) {
        const data = await resLeads.json();
        leadsTags = data.tags || [];
      }
      let chatwootTags = [];
      if (resChatwoot && resChatwoot.ok) {
        const data = await resChatwoot.json();
        if (Array.isArray(data)) {
          chatwootTags = data.map(item => item.title || item.name || '').filter(Boolean);
        }
      }
      const combined = Array.from(new Set([...leadsTags, ...chatwootTags]))
        .map(t => t.trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));
      setAvailableTags(combined);
    } catch (err) {
      console.error("Erro ao buscar etiquetas:", err);
    } finally {
      setIsLoadingTags(false);
    }
  };

  React.useEffect(() => {
    if (isTagModalOpen) fetchTags();
  }, [isTagModalOpen]);

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

  const handleSaveTags = async () => {
    if (!activeClient) return toast.error("Selecione um cliente primeiro");
    if (selectedPhones.length === 0) return toast.error("Nenhum contato selecionado");
    if (!tagInput.trim()) return toast.error("Digite ou selecione uma etiqueta");
    
    setIsSavingLeads(true);
    const loadingToast = toast.loading(`Sincronizando ${selectedPhones.length} contatos...`);
    
    try {
      const safeContacts = contacts || [];
      const leadsPayload = selectedPhones.map(phone => {
        const match = safeContacts.find(c => getContactPhone(c) === phone);
        return {
          phone: phone,
          name: match?.contact_name || match?.name || null,
          email: match?.email || null
        };
      });
      
      const res = await fetchWithAuth(`${API_URL}/leads/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leads: leadsPayload,
          tags: tagInput
        })
      }, activeClient.id);
      
      if (res.ok) {
        const data = await res.json();
        toast.dismiss(loadingToast);
        toast.success(`${data.imported} contatos atualizados na aba Contatos!`, { icon: '✅' });
        setIsTagModalOpen(false);
        setSelectedPhones([]);
        setTagInput('');
      } else {
        const error = await res.json();
        throw new Error(error.detail || "Erro ao salvar contatos");
      }
    } catch (err) {
      console.error("Erro ao sincronizar tags de contatos:", err);
      toast.dismiss(loadingToast);
      toast.error(err.message || "Erro ao salvar contatos no banco");
    } finally {
      setIsSavingLeads(false);
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
          )
        }
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

      {/* Modal de Etiquetas */}
      {isTagModalOpen && (
        <div className="fixed inset-0 z-[20050] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#1e293b] border border-white/5 rounded-[2rem] w-full max-w-md flex flex-col shadow-2xl animate-in zoom-in-95 duration-200" style={{ userSelect: 'none' }}>
            <div className="p-5 border-b border-white/5 bg-[#0f172a]/50 flex justify-between items-center rounded-t-[2rem]">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-400"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                Adicionar Etiquetas
              </h3>
              <button 
                onClick={() => { if (!isSavingLeads) setIsTagModalOpen(false); }} 
                className="text-gray-400 hover:text-gray-200 transition"
                disabled={isSavingLeads}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
                Adicione uma ou mais etiquetas para os <strong>{selectedPhones.length}</strong> contatos selecionados. Se os contatos não existirem na aba "Contatos", eles serão criados automaticamente.
              </p>
              
              <div className="relative">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Nome da Etiqueta
                </label>
                
                <input
                  type="text"
                  disabled={isSavingLeads}
                  placeholder="Digite ou selecione uma etiqueta..."
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs font-bold text-white placeholder:text-slate-500 hover:border-emerald-500/30 focus:border-emerald-500/50 outline-none transition-all shadow-inner"
                  value={tagInput}
                  onChange={(e) => {
                    setTagInput(e.target.value);
                    setIsTagsDropdownOpen(true);
                    setTagsSearch(e.target.value);
                  }}
                  onFocus={() => setIsTagsDropdownOpen(true)}
                />
                
                {isTagsDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40 bg-transparent"
                      onClick={() => setIsTagsDropdownOpen(false)}
                    />
                    <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-[#0f172a] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-3 bg-slate-800/50 border-b border-white/5 relative">
                      <input
                        type="text"
                        autoFocus
                        placeholder="Filtrar etiquetas..."
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-9 py-2 text-xs font-bold text-white placeholder:text-slate-600 outline-none focus:border-emerald-500/50 transition-all"
                        value={tagsSearch}
                        onChange={(e) => setTagsSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <svg className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                    </div>
                    <div className="max-h-48 overflow-y-auto premium-scrollbar">
                      {isLoadingTags ? (
                        <div className="p-4 text-center text-xs text-gray-500">Carregando...</div>
                      ) : (
                        <>
                          {availableTags
                            .filter(tag => tag.toLowerCase().includes(tagsSearch.toLowerCase()))
                            .map(tag => (
                              <div 
                                key={tag}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTagInput(tag);
                                  setIsTagsDropdownOpen(false);
                                  setTagsSearch('');
                                }}
                                className={`px-5 py-3 hover:bg-emerald-500/10 cursor-pointer transition-colors flex items-center justify-between group/item ${tagInput === tag ? 'bg-emerald-500/5' : ''}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 opacity-40 group-hover/item:opacity-100 transition-opacity"></div>
                                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">{tag}</span>
                                </div>
                                {tagInput === tag && (
                                  <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4">
                                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </div>
                            ))}
                          {availableTags.filter(tag => tag.toLowerCase().includes(tagsSearch.toLowerCase())).length === 0 && (
                            <div className="p-6 text-center">
                              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nenhuma etiqueta encontrada</p>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTagInput(tagsSearch);
                                  setIsTagsDropdownOpen(false);
                                  setTagsSearch('');
                                }}
                                className="mt-2 text-xs font-bold text-emerald-500 hover:text-emerald-400 underline uppercase tracking-widest"
                              >
                                Usar "{tagsSearch}"
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  </>
                )}
              </div>
            </div>
            
            <div className="p-5 border-t border-white/5 bg-[#0f172a]/50 flex justify-end gap-3 rounded-b-[2rem]">
              <button 
                onClick={() => setIsTagModalOpen(false)}
                disabled={isSavingLeads}
                className="px-4 py-2 bg-slate-800 text-gray-300 hover:bg-slate-700 rounded-lg text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveTags}
                disabled={isSavingLeads || !tagInput}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-950/20 flex items-center gap-2"
              >
                {isSavingLeads ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};

export default ContactsViewerModal;
