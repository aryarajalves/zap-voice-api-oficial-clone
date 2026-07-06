import React from 'react';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';
import { useClient } from '../../../contexts/ClientContext';
import { toast } from 'react-hot-toast';

const TagContactsModal = ({ isOpen, onClose, selectedPhones, contacts, setContactsModal, onClearSelection }) => {
  const { activeClient } = useClient();
  const [tagInput, setTagInput] = React.useState('');
  const [selectedTags, setSelectedTags] = React.useState([]);
  const [availableTags, setAvailableTags] = React.useState([]);
  const [isLoadingTags, setIsLoadingTags] = React.useState(false);
  const [isSavingLeads, setIsSavingLeads] = React.useState(false);
  const [isTagsDropdownOpen, setIsTagsDropdownOpen] = React.useState(false);
  const [tagsSearch, setTagsSearch] = React.useState('');

  React.useEffect(() => {
    if (isOpen) {
      setSelectedTags([]);
      setTagInput('');
      setTagsSearch('');
      fetchTags();
    }
  }, [isOpen]);

  const fetchTags = async () => {
    if (!activeClient) return;
    setIsLoadingTags(true);
    try {
      const resLeads = await fetchWithAuth(`${API_URL}/leads/filters`, {}, activeClient.id);
      let leadsTags = [];
      if (resLeads && resLeads.ok) {
        const data = await resLeads.json();
        leadsTags = data.tags || [];
      }
      let chatwootTags = [];
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

  const getContactPhone = (contact) => {
    return contact.phone_number || contact.phone || '';
  };

  const handleSaveTags = async () => {
    if (!activeClient) return toast.error("Selecione um cliente primeiro");
    if (selectedPhones.length === 0) return toast.error("Nenhum contato selecionado");
    
    let tagsToSend = [...selectedTags];
    const currentTyped = tagInput.trim();
    if (currentTyped) {
      const cleanTyped = currentTyped.replace(/,/g, '').trim();
      if (cleanTyped && !tagsToSend.includes(cleanTyped)) {
        tagsToSend.push(cleanTyped);
      }
    }
    
    if (tagsToSend.length === 0) return toast.error("Digite ou selecione pelo menos uma etiqueta");
    
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
      
      const tagsString = tagsToSend.join(',');
      const res = await fetchWithAuth(`${API_URL}/leads/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leads: leadsPayload,
          tags: tagsString
        })
      }, activeClient.id);
      
      if (res.ok) {
        const data = await res.json();
        toast.dismiss(loadingToast);
        toast.success(`${data.imported} contatos atualizados na aba Contatos!`, { icon: '✅' });
        
        // Atualiza contatos localmente imediatamente
        if (setContactsModal) {
          setContactsModal(prev => {
            const updatedContacts = (prev.contacts || []).map(c => {
              const phone = c.phone_number || c.phone || '';
              if (phone && selectedPhones.includes(phone)) {
                const existing = c.lead_tags 
                  ? c.lead_tags.split(',').map(t => t.trim()).filter(Boolean) 
                  : [];
                const combined = Array.from(new Set([...existing, ...tagsToSend]));
                return {
                  ...c,
                  lead_tags: combined.join(', ')
                };
              }
              return c;
            });
            return {
              ...prev,
              contacts: updatedContacts
            };
          });
        }
        
        onClearSelection();
        onClose();
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

  return (
    <div className="fixed inset-0 z-[20050] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#1e293b] border border-white/5 rounded-[2rem] w-full max-w-md flex flex-col shadow-2xl animate-in zoom-in-95 duration-200" style={{ userSelect: 'none' }}>
        <div className="p-5 border-b border-white/5 bg-[#0f172a]/50 flex justify-between items-center rounded-t-[2rem]">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-400"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
            Adicionar Etiquetas
          </h3>
          <button 
            onClick={() => { if (!isSavingLeads) onClose(); }} 
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
          
          <div className="space-y-3">
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2.5 bg-black/20 border border-white/5 rounded-xl min-h-[42px] max-h-28 overflow-y-auto premium-scrollbar">
                {selectedTags.map(tag => (
                  <span 
                    key={tag} 
                    className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-md border border-emerald-500/20 flex items-center gap-1.5 animate-in zoom-in-95 duration-150"
                  >
                    {tag}
                    <button 
                      type="button"
                      onClick={() => setSelectedTags(prev => prev.filter(t => t !== tag))}
                      className="hover:text-red-400 transition"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="relative">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                Nome da Etiqueta
              </label>
              
              <input
                type="text"
                disabled={isSavingLeads}
                placeholder="Digite e pressione Enter ou selecione abaixo..."
                className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs font-bold text-white placeholder:text-slate-500 hover:border-emerald-500/30 focus:border-emerald-500/50 outline-none transition-all shadow-inner"
                value={tagInput}
                onChange={(e) => {
                  setTagInput(e.target.value);
                  setIsTagsDropdownOpen(true);
                  setTagsSearch(e.target.value);
                }}
                onFocus={() => setIsTagsDropdownOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    const val = tagInput.trim().replace(/,/g, '');
                    if (val && !selectedTags.includes(val)) {
                      setSelectedTags(prev => [...prev, val]);
                    }
                    setTagInput('');
                    setTagsSearch('');
                  }
                }}
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
                                  if (selectedTags.includes(tag)) {
                                    setSelectedTags(prev => prev.filter(t => t !== tag));
                                  } else {
                                    setSelectedTags(prev => [...prev, tag]);
                                  }
                                }}
                                className={`px-5 py-3 hover:bg-emerald-500/10 cursor-pointer transition-colors flex items-center justify-between group/item ${selectedTags.includes(tag) ? 'bg-emerald-500/5' : ''}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 opacity-40 group-hover/item:opacity-100 transition-opacity"></div>
                                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">{tag}</span>
                                </div>
                                {selectedTags.includes(tag) && (
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
                                  const val = tagsSearch.trim();
                                  if (val && !selectedTags.includes(val)) {
                                    setSelectedTags(prev => [...prev, val]);
                                  }
                                  setTagInput('');
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
        </div>
        
        <div className="p-5 border-t border-white/5 bg-[#0f172a]/50 flex justify-end gap-3 rounded-b-[2rem]">
          <button 
            onClick={onClose}
            disabled={isSavingLeads}
            className="px-4 py-2 bg-slate-800 text-gray-300 hover:bg-slate-700 rounded-lg text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSaveTags}
            disabled={isSavingLeads || (selectedTags.length === 0 && !tagInput.trim())}
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
  );
};

export default TagContactsModal;
