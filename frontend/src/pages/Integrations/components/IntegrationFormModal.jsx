import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiCheckCircle, FiShare2, FiSettings, FiChevronDown, FiSearch, FiZap, FiTag, FiSliders } from 'react-icons/fi';
import MappingsConfig from './MappingsConfig/index';

function UpsellProductsConfig({ upsellProducts = [], discoveredProducts = [], onChange }) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  const addProduct = (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (upsellProducts.some(p => p.toLowerCase() === trimmed.toLowerCase())) return;
    onChange([...upsellProducts, trimmed]);
    setInputValue('');
    inputRef.current?.focus();
  };

  const removeProduct = (name) => {
    onChange(upsellProducts.filter(p => p !== name));
  };

  const suggestions = discoveredProducts.filter(
    p => !upsellProducts.some(u => u.toLowerCase() === p.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <FiZap className="text-yellow-400" size={14} />
        <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Produtos Upsell</span>
      </div>
      <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">
        Quando uma compra chegar com um produto cujo nome esteja nesta lista, ela será identificada automaticamente como <span className="text-yellow-400 font-bold">Compra Aprovada (Upsell)</span>.
      </p>

      {/* Tag chips de produtos já adicionados */}
      {upsellProducts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {upsellProducts.map(name => (
            <span
              key={name}
              className="inline-flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-[10px] font-bold px-3 py-1.5 rounded-full"
            >
              <FiZap size={9} />
              {name}
              <button
                type="button"
                onClick={() => removeProduct(name)}
                className="text-yellow-400/60 hover:text-yellow-200 transition-colors ml-0.5"
              >
                <FiX size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input para adicionar manualmente */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); addProduct(inputValue); }
          }}
          placeholder="Digite o nome exato do produto upsell..."
          className="flex-1 bg-white dark:bg-[#0b1120] border border-gray-100 dark:border-white/5 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-900 dark:text-white focus:ring-4 focus:ring-yellow-500/10 focus:border-yellow-500 transition-all outline-none shadow-inner placeholder-gray-400"
        />
        <button
          type="button"
          onClick={() => addProduct(inputValue)}
          disabled={!inputValue.trim()}
          className="bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 text-yellow-300 px-4 py-2.5 rounded-xl text-xs font-black transition-all disabled:opacity-40 uppercase tracking-widest"
        >
          Adicionar
        </button>
      </div>

      {/* Sugestões dos produtos descobertos */}
      {suggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold flex items-center gap-1.5">
            <FiTag size={9} />
            Produtos detectados no histórico (clique para adicionar)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map(name => (
              <button
                key={name}
                type="button"
                onClick={() => addProduct(name)}
                className="inline-flex items-center gap-1 bg-white/5 hover:bg-yellow-500/10 border border-white/10 hover:border-yellow-500/30 text-gray-400 hover:text-yellow-300 text-[10px] font-bold px-2.5 py-1 rounded-full transition-all"
              >
                + {name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const PLATFORM_OPTIONS = [
  { value: 'braip',     label: 'Braip' },
  { value: 'cakto',    label: 'Cakto' },
  { value: 'eduzz',    label: 'Eduzz' },
  { value: 'elementor',label: 'Elementor / Webhook Genérico' },
  { value: 'greenn',   label: 'Greenn' },
  { value: 'herospark',label: 'HeroSpark' },
  { value: 'guru',     label: 'Digital Manager Guru' },
  { value: 'hotmart',  label: 'Hotmart' },
  { value: 'hubla',    label: 'Hubla' },
  { value: 'lastlink', label: 'Lastlink' },
  { value: 'kirvano',  label: 'Kirvano' },
  { value: 'kiwify',   label: 'Kiwify' },
  { value: 'monetizze',label: 'Monetizze' },
  { value: 'outra',    label: 'Outra Plataforma' },
  { value: 'pagtrust', label: 'PagTrust' },
  { value: 'pepper',   label: 'Pepper' },
  { value: 'ticto',    label: 'Ticto' },
];

function PlatformSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selected = PLATFORM_OPTIONS.find(o => o.value === value);
  const filtered = PLATFORM_OPTIONS.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (open) inputRef.current?.focus();
    else setSearch('');
  }, [open]);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full bg-white dark:bg-[#0b1120] border border-gray-100 dark:border-white/5 rounded-xl px-4 py-3 text-xs font-bold text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none shadow-inner cursor-pointer flex items-center justify-between gap-2"
      >
        <span>{selected?.label || 'Selecione...'}</span>
        <FiChevronDown className={`shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-[99999] mt-1.5 w-full bg-[#0f172a] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
          {/* Campo de busca */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
            <FiSearch className="text-gray-500 shrink-0" size={12} />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar plataforma..."
              className="flex-1 bg-transparent text-xs text-white placeholder-gray-500 outline-none"
            />
          </div>
          {/* Lista filtrada */}
          <ul className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-xs text-gray-500 italic">Nenhuma encontrada</li>
            ) : filtered.map(opt => (
              <li
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`px-4 py-2.5 text-xs font-bold cursor-pointer transition-colors ${
                  opt.value === value
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                {opt.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const TABS = [
  { id: 'config',   label: 'Configuração', icon: FiSliders },
  { id: 'upsell',   label: 'Upsell',       icon: FiZap     },
  { id: 'gatilhos', label: 'Gatilhos',      icon: FiSettings },
];

const IntegrationFormModal = ({
  isOpen,
  onClose,
  formData,
  setFormData,
  isSaving,
  onSave,
  editingIntegration,
  templates,
  funnels,
  chatwootLabels,
  setIsMappingGuideOpen,
  existingInternalTags
}) => {
  const [activeTab, setActiveTab] = useState('config');

  if (!isOpen) return null;

  const mappingCount = (formData.mappings || []).length;
  const upsellCount  = (formData.upsell_products || []).length;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-6 animate-in fade-in duration-500">
      <div className="bg-white dark:bg-[#1e293b] rounded-3xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-[0_0_100px_rgba(59,130,246,0.15)] overflow-hidden border border-gray-100 dark:border-white/5 animate-in zoom-in-95 duration-300">

        {/* Header */}
        <div className="px-6 pt-6 pb-0 bg-white/50 dark:bg-[#0f172a]/50 backdrop-blur-md border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-xl shadow-blue-600/20 shrink-0">
              <FiSettings size={22} />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                {editingIntegration ? 'Editar Integração' : 'Nova Integração'}
              </h3>
              <p className="text-[10px] text-gray-500 font-medium mt-0.5 uppercase tracking-widest">Automação para {formData.platform}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const badge = tab.id === 'gatilhos' ? mappingCount : tab.id === 'upsell' ? upsellCount : null;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-5 py-3 text-[11px] font-black uppercase tracking-widest transition-all rounded-t-xl border-b-2 ${
                    isActive
                      ? 'text-blue-500 border-blue-500 bg-blue-500/5'
                      : 'text-gray-400 border-transparent hover:text-gray-200 hover:bg-white/5'
                  }`}
                >
                  <Icon size={13} />
                  {tab.label}
                  {badge > 0 && (
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none ${
                      isActive ? 'bg-blue-500 text-white' : 'bg-white/10 text-gray-400'
                    }`}>
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar bg-gray-50/30 dark:bg-transparent">
          <form className="max-w-5xl mx-auto">

            {/* Aba: Configuração */}
            {activeTab === 'config' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] px-1">Nome da Integração (Interno)</label>
                  <div className="relative group">
                    <FiSettings className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-white dark:bg-[#0b1120] border border-gray-100 dark:border-white/5 rounded-xl pl-12 pr-4 py-3 text-xs font-bold text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none shadow-inner"
                      placeholder="Ex: Hotmart - Produto VIP"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] px-1">Slug Personalizado (URL Amigável)</label>
                  <div className="relative group">
                    <FiShare2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type="text"
                      value={formData.custom_slug || ''}
                      onChange={(e) => setFormData({ ...formData, custom_slug: e.target.value })}
                      className="w-full bg-white dark:bg-[#0b1120] border border-gray-100 dark:border-white/5 rounded-xl pl-12 pr-4 py-3 text-xs font-bold text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none shadow-inner"
                      placeholder="Ex: vendas-vips (Opcional)"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] px-1">Plataforma de Origem</label>
                  <PlatformSelect
                    value={formData.platform}
                    onChange={(val) => setFormData({ ...formData, platform: val })}
                  />
                </div>
              </div>
            )}

            {/* Aba: Upsell */}
            {activeTab === 'upsell' && (
              <div className="bg-white dark:bg-[#0b1120] border border-gray-100 dark:border-white/5 rounded-2xl p-6 shadow-inner">
                <UpsellProductsConfig
                  upsellProducts={formData.upsell_products || []}
                  discoveredProducts={formData.discovered_products || []}
                  onChange={(list) => setFormData({ ...formData, upsell_products: list })}
                />
              </div>
            )}

            {/* Aba: Gatilhos */}
            {activeTab === 'gatilhos' && (
              <MappingsConfig
                formData={formData}
                setFormData={setFormData}
                templates={templates}
                funnels={funnels}
                chatwootLabels={chatwootLabels}
                setIsMappingGuideOpen={setIsMappingGuideOpen}
                discoveredProducts={formData.discovered_products || []}
                existingInternalTags={existingInternalTags}
              />
            )}

          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 dark:border-white/5 flex items-center justify-between bg-white dark:bg-[#0f172a]/80 backdrop-blur-md">
          {/* Navegação entre abas no footer */}
          <div className="flex gap-2">
            {TABS.map((tab, i) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`w-2 h-2 rounded-full transition-all ${
                  activeTab === tab.id ? 'bg-blue-500 w-5' : 'bg-white/20 hover:bg-white/40'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-[10px] font-black text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all uppercase tracking-widest"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-3.5 rounded-xl font-black transition-all active:scale-95 flex items-center gap-2 shadow-xl shadow-blue-600/20 disabled:opacity-50 uppercase tracking-widest text-xs"
            >
              {isSaving ? <FiSettings className="animate-spin" /> : <FiCheckCircle size={16} />}
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default IntegrationFormModal;
