import React from 'react';
import { FiSearch } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import TemplatePreview from '../common/TemplatePreview';
import { getTemplateCategoryInfo } from '../utils/templateUtils';
import MediaHeaderUploader from '../common/MediaHeaderUploader';
import ConfirmationDialog from '../../TriggerHistory/components/ConfirmationDialog';

const TemplateSelectionSection = ({
    selectedTemplate,
    templates,
    isLoadingTemplates,
    templateSearch,
    setTemplateSearch,
    isTemplateDropdownOpen,
    setIsTemplateDropdownOpen,
    handleTemplateChange,
    selectedTemplateObj,
    templateParams,
    handleParamChange,
    openExpansion
}) => {
    const [selectedTag, setSelectedTag] = React.useState(null);
    const [selectedCategory, setSelectedCategory] = React.useState('ALL'); // 'ALL', 'MARKETING', 'UTILITY'
    const [isReset24hModalOpen, setIsReset24hModalOpen] = React.useState(false);
    const [resetting24h, setResetting24h] = React.useState(false);

    const allTags = React.useMemo(() => {
        if (!templates) return [];
        const tagsSet = new Set();
        templates.forEach(t => {
            if (t && Array.isArray(t.tags)) {
                if (t.status && t.status.toUpperCase() !== 'APPROVED' && t.status.toUpperCase() !== 'ACTIVE') return;
                t.tags.forEach(tag => {
                    if (tag && tag.trim()) {
                        tagsSet.add(tag.trim());
                    }
                });
            }
        });
        return Array.from(tagsSet);
    }, [templates]);

    return (
        <div className="space-y-8 relative z-10">
            <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Selecione o Template</label>
                <div className="relative template-dropdown-container">
                    <div 
                        onClick={() => setIsTemplateDropdownOpen(!isTemplateDropdownOpen)}
                        className="w-full bg-slate-900 border-2 border-white/5 rounded-2xl px-6 py-4 text-xs font-bold text-white focus:border-green-500/50 outline-none transition-all cursor-pointer shadow-inner flex justify-between items-center group"
                    >
                        <span className={selectedTemplate ? "text-white" : "text-slate-500"}>
                            {selectedTemplate 
                                ? `${(templates?.find(t => t.name === selectedTemplate)?.is_pinned) ? '📌 ' : ''}${selectedTemplate} (${getTemplateCategoryInfo(selectedTemplate, templates).type})` 
                                : (isLoadingTemplates ? "Carregando templates..." : "-- Escolha um template cadastrado --")}
                        </span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`text-slate-500 group-hover:text-green-500 transition-all ${isTemplateDropdownOpen ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9" /></svg>
                    </div>

                    {isTemplateDropdownOpen && (
                        <div className="absolute top-full left-0 w-full mt-2 bg-slate-900 border-2 border-white/10 rounded-2xl shadow-2xl z-[9999] overflow-hidden">
                            <div className="p-4 border-b border-white/5 bg-black/20 space-y-3">
                                <div className="relative">
                                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                                    <input 
                                        autoFocus
                                        type="text"
                                        placeholder="Filtrar templates..."
                                        className="w-full bg-slate-800 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium text-white outline-none focus:border-green-500/30 transition-all"
                                        value={templateSearch}
                                        onChange={(e) => setTemplateSearch(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>

                                <div className="flex items-center gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
                                    <span className="text-[9px] font-black uppercase text-slate-500 mr-1 tracking-wider">Categoria:</span>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedCategory('ALL')}
                                        className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                                            selectedCategory === 'ALL'
                                                ? 'bg-green-500 text-slate-950 shadow-md shadow-green-500/20'
                                                : 'bg-slate-850 text-slate-400 hover:bg-slate-750 hover:text-white'
                                        }`}
                                    >
                                        Todos
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedCategory('MARKETING')}
                                        className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                                            selectedCategory === 'MARKETING'
                                                ? 'bg-green-500 text-slate-950 shadow-md shadow-green-500/20'
                                                : 'bg-slate-850 text-slate-400 hover:bg-slate-750 hover:text-white'
                                        }`}
                                    >
                                        📢 Marketing
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedCategory('UTILITY')}
                                        className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                                            selectedCategory === 'UTILITY'
                                                ? 'bg-green-500 text-slate-950 shadow-md shadow-green-500/20'
                                                : 'bg-slate-850 text-slate-400 hover:bg-slate-750 hover:text-white'
                                        }`}
                                    >
                                        🛠️ Utility
                                    </button>
                                </div>

                                {allTags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedTag(null)}
                                            className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                                                !selectedTag 
                                                    ? 'bg-green-500 text-slate-950 shadow-md shadow-green-500/20' 
                                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-750 hover:text-white'
                                            }`}
                                        >
                                            Todos
                                        </button>
                                        {allTags.map(tag => (
                                            <button
                                                type="button"
                                                key={tag}
                                                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                                                className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                                                    selectedTag === tag 
                                                        ? 'bg-green-500 text-slate-950 shadow-md shadow-green-500/20' 
                                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-750 hover:text-white'
                                                }`}
                                            >
                                                {tag}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="max-h-72 overflow-y-auto premium-scrollbar relative z-[9999]">
                                <div 
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setIsTemplateDropdownOpen(false);
                                        handleTemplateChange({ target: { value: "" } });
                                        setTemplateSearch('');
                                        setSelectedTag(null);
                                    }}
                                    className="px-6 py-3 hover:bg-slate-500/10 cursor-pointer transition-colors flex flex-col gap-0.5 border-b border-white/5"
                                >
                                    <span className="text-xs font-bold text-slate-500 italic">-- Nenhum Template --</span>
                                </div>
                                {(templates || [])
                                    .filter(t => {
                                        if (!t || !t.name) return false;
                                        if (t.status && t.status.toUpperCase() !== 'APPROVED' && t.status.toUpperCase() !== 'ACTIVE') return false;
                                        const matchesSearch = t.name.toLowerCase().includes((templateSearch || '').toLowerCase());
                                        const matchesTag = !selectedTag || (Array.isArray(t.tags) && t.tags.includes(selectedTag));
                                        
                                        // Filtro de Categoria
                                        const categoryVal = (t.category || getTemplateCategoryInfo(t.name, templates).type || '').toUpperCase();
                                        const matchesCategory = selectedCategory === 'ALL' || categoryVal === selectedCategory;
                                        
                                        return matchesSearch && matchesTag && matchesCategory;
                                    })
                                    .map(t => (
                                        <div 
                                            key={t.name}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setIsTemplateDropdownOpen(false);
                                                handleTemplateChange({ target: { value: t.name } });
                                                setTemplateSearch('');
                                                setSelectedTag(null);
                                            }}
                                            className={`px-6 py-3 hover:bg-green-500/10 cursor-pointer transition-colors flex flex-col gap-1 ${selectedTemplate === t.name ? 'bg-green-500/5' : ''}`}
                                        >
                                            <div className="flex justify-between items-center gap-2">
                                                <span className="text-xs font-bold text-white truncate max-w-[60%]">
                                                    {t.is_pinned ? '📌 ' : ''}{t.name}
                                                </span>
                                                {t.tags && t.tags.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 justify-end max-w-[40%]">
                                                        {t.tags.map(tag => (
                                                            <span key={tag} className="px-1.5 py-0.5 rounded bg-slate-800 text-green-400 border border-green-500/10 text-[8px] font-bold truncate">
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{getTemplateCategoryInfo(t.name, templates).type}</span>
                                        </div>
                                    ))
                                }
                                {(templates || []).filter(t => {
                                    if (!t || !t.name) return false;
                                    if (t.status && t.status.toUpperCase() !== 'APPROVED' && t.status.toUpperCase() !== 'ACTIVE') return false;
                                    const matchesSearch = t.name.toLowerCase().includes((templateSearch || '').toLowerCase());
                                    const matchesTag = !selectedTag || (Array.isArray(t.tags) && t.tags.includes(selectedTag));
                                    return matchesSearch && matchesTag;
                                }).length === 0 && (
                                    <div className="px-6 py-8 text-center text-slate-500 text-[10px] font-bold uppercase tracking-widest italic">
                                        Nenhum template encontrado
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {selectedTemplateObj && (
                <div className="space-y-8 animate-in zoom-in-95 duration-300">
                    {/* Ações rápidas do Template Selecionado (Ex: Limpar 24h) */}
                    <div className="flex justify-between items-center bg-slate-900/60 border border-white/5 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span className="font-bold text-white">{selectedTemplateObj.name}</span>
                            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono uppercase">{selectedTemplateObj.category || 'MARKETING'}</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsReset24hModalOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95"
                            title="Zerar restrição de 24h para este template (permite re-envio imediato para todos os contatos)"
                        >
                            <span>🔄</span>
                            <span>Resetar Janela de 24h</span>
                        </button>
                    </div>

                    <ConfirmationDialog
                        isOpen={isReset24hModalOpen}
                        onClose={() => setIsReset24hModalOpen(false)}
                        onConfirm={async () => {
                            setResetting24h(true);
                            try {
                                const { API_URL } = await import('../../../config');
                                const { fetchWithAuth } = await import('../../../AuthContext');
                                const activeClient = JSON.parse(localStorage.getItem('activeClient') || '{}');
                                const res = await fetchWithAuth(`${API_URL}/whatsapp/templates/${encodeURIComponent(selectedTemplateObj.name)}/24h-history`, {
                                    method: 'DELETE'
                                }, activeClient.id);
                                const data = await res.json();
                                if (res.ok) {
                                    toast.success(`Restrição de 24h zerada para "${selectedTemplateObj.name}"!`);
                                    setIsReset24hModalOpen(false);
                                } else {
                                    toast.error(`Erro: ${data.detail || 'Falha ao limpar histórico'}`);
                                }
                            } catch (err) {
                                toast.error(`Erro de conexão: ${err.message}`);
                            } finally {
                                setResetting24h(false);
                            }
                        }}
                        title="Zerar Janela de 24h"
                        message={`Deseja zerar a restrição de 24h para o template "${selectedTemplateObj.name}"? Isso permitirá re-disparar este template imediatamente para contatos que já receberam nas últimas 24h.`}
                        confirmText="Sim, Zerar Restrição"
                        confirmColorClass="bg-amber-600 hover:bg-amber-500"
                        icon="🔄"
                        loading={resetting24h}
                    />

                    {/* Upload de mídia para cabeçalhos IMAGE/VIDEO/DOCUMENT */}
                    {(() => {
                        const headerComp = selectedTemplateObj.components?.find(c => c.type === 'HEADER');
                        if (!headerComp || !['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerComp.format)) return null;
                        return (
                            <MediaHeaderUploader
                                format={headerComp.format}
                                templateParams={templateParams}
                                handleParamChange={handleParamChange}
                            />
                        );
                    })()}

                    {/* Pré-visualização embaixo, ocupando largura total */}
                    <div className="pt-2">
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-1 mb-6">Pré-visualização do Template</h3>
                        <div className="w-full">
                            <TemplatePreview template={selectedTemplateObj} params={templateParams} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TemplateSelectionSection;
