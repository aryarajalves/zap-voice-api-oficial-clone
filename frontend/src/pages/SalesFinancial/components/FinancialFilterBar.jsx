import React, { useState, useEffect, useRef } from 'react';

const PERIOD_OPTIONS = [
  { value: 'daily', label: 'Por Dia' },
  { value: 'weekly', label: 'Por Semana' },
  { value: 'monthly', label: 'Por Mês' },
  { value: 'yearly', label: 'Por Ano' },
];

const STATUS_FILTER_OPTIONS = [
  { value: 'approved', label: 'Compra Aprovada' },
  { value: 'refunded', label: 'Reembolso' },
];

const PLATFORM_FILTER_OPTIONS = [
  { value: 'all',       label: 'Todas as Plataformas' },
  { value: 'braip',     label: 'Braip' },
  { value: 'cakto',     label: 'Cakto' },
  { value: 'eduzz',     label: 'Eduzz' },
  { value: 'greenn',    label: 'Greenn' },
  { value: 'guru',      label: 'Digital Manager Guru' },
  { value: 'herospark', label: 'HeroSpark' },
  { value: 'hotmart',   label: 'Hotmart' },
  { value: 'hubla',     label: 'Hubla' },
  { value: 'kirvano',   label: 'Kirvano' },
  { value: 'kiwify',    label: 'Kiwify' },
  { value: 'lastlink',  label: 'Lastlink' },
  { value: 'monetizze', label: 'Monetizze' },
  { value: 'pagtrust',  label: 'PagTrust' },
  { value: 'pepper',    label: 'Pepper' },
  { value: 'ticto',     label: 'Ticto' },
  { value: 'zapgroup',  label: 'ZapGroup' },
];

const PAYMENT_METHOD_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'pix', label: 'Pix' },
  { value: 'credit_card', label: 'Cartão de Crédito' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'other', label: 'Outros' },
];

export default function FinancialFilterBar({
  period,
  setPeriod,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  selectedLabels,
  setSelectedLabels,
  allLabels = [],
  platforms,
  setPlatforms,
  statuses,
  setStatuses,
  selectedProducts,
  setSelectedProducts,
  allProducts = [],
  paymentMethod,
  setPaymentMethod,
  onResetTxPage
}) {
  const [labelDropdownOpen, setLabelDropdownOpen] = useState(false);
  const labelDropdownRef = useRef(null);
  useEffect(() => {
    if (!labelDropdownOpen) return;
    const handler = (e) => {
      if (labelDropdownRef.current && !labelDropdownRef.current.contains(e.target)) setLabelDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [labelDropdownOpen]);

  const [platformDropdownOpen, setPlatformDropdownOpen] = useState(false);
  const platformDropdownRef = useRef(null);
  useEffect(() => {
    if (!platformDropdownOpen) return;
    const handler = (e) => {
      if (platformDropdownRef.current && !platformDropdownRef.current.contains(e.target)) setPlatformDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [platformDropdownOpen]);

  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef(null);
  useEffect(() => {
    if (!statusDropdownOpen) return;
    const handler = (e) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target)) setStatusDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [statusDropdownOpen]);

  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const productDropdownRef = useRef(null);
  useEffect(() => {
    if (!productDropdownOpen) return;
    const handler = (e) => {
      if (productDropdownRef.current && !productDropdownRef.current.contains(e.target)) setProductDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [productDropdownOpen]);

  return (
    <div className="flex flex-col gap-3">
      {/* Period Selector & Date Inputs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2 flex-wrap">
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => {
                setPeriod(opt.value);
                setStartDate('');
                setEndDate('');
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                period === opt.value
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">De:</span>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Até:</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-950/50 transition-all cursor-pointer"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Row of Multi-select Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Label Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium shrink-0">Etiqueta do Contato:</span>
          <div className="relative" ref={labelDropdownRef}>
            <button
              onClick={() => setLabelDropdownOpen(o => !o)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all min-w-[180px] justify-between cursor-pointer ${
                selectedLabels.length > 0
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/40 font-bold'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <span className="truncate">
                {selectedLabels.length === 0
                  ? 'Todas as Etiquetas'
                  : selectedLabels.length === 1
                    ? selectedLabels[0]
                    : `${selectedLabels.length} etiquetas`}
              </span>
              <svg className={`w-3 h-3 transition-transform ${labelDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {labelDropdownOpen && (
              <div className="absolute z-50 top-full mt-1 left-0 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="p-1 max-h-64 overflow-y-auto overflow-x-hidden">
                  {(!allLabels || allLabels.length === 0) ? (
                    <div className="p-3 text-xs text-gray-400 text-center">Nenhuma etiqueta cadastrada</div>
                  ) : (
                    allLabels.map(lbl => {
                      const checked = selectedLabels.includes(lbl);
                      return (
                        <button
                          key={lbl}
                          onClick={() => {
                            setSelectedLabels(prev =>
                              prev.includes(lbl)
                                ? prev.filter(l => l !== lbl)
                                : [...prev, lbl]
                            );
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all text-left truncate cursor-pointer"
                        >
                          <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${checked ? 'bg-blue-500 border-blue-500' : 'border-gray-300 dark:border-gray-600'}`}>
                            {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                          </span>
                          <span className="truncate">{lbl}</span>
                        </button>
                      );
                    })
                  )}
                </div>
                {selectedLabels.length > 0 && (
                  <div className="border-t border-gray-100 dark:border-gray-700 p-1">
                    <button
                      onClick={() => { setSelectedLabels([]); setLabelDropdownOpen(false); }}
                      className="w-full px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all text-left cursor-pointer"
                    >
                      Limpar seleção de etiquetas
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Platform filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium shrink-0">Plataforma:</span>
          <div className="relative" ref={platformDropdownRef}>
            <button
              onClick={() => setPlatformDropdownOpen(o => !o)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all min-w-[180px] justify-between cursor-pointer"
            >
              <span>
                {platforms.length === 0
                  ? 'Todas as Plataformas'
                  : platforms.length === 1
                    ? PLATFORM_FILTER_OPTIONS.find(o => o.value === platforms[0])?.label
                    : `${platforms.length} plataformas`}
              </span>
              <svg className={`w-3 h-3 transition-transform ${platformDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {platformDropdownOpen && (
              <div className="absolute z-50 top-full mt-1 left-0 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden">
                <div className="p-1 max-h-64 overflow-y-auto overflow-x-hidden">
                  {PLATFORM_FILTER_OPTIONS.filter(o => o.value !== 'all').map(opt => {
                    const checked = platforms.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setPlatforms(prev =>
                            prev.includes(opt.value)
                              ? prev.filter(p => p !== opt.value)
                              : [...prev, opt.value]
                          );
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all text-left cursor-pointer"
                      >
                        <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${checked ? 'bg-blue-500 border-blue-500' : 'border-gray-300 dark:border-gray-600'}`}>
                          {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </span>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                {platforms.length > 0 && (
                  <div className="border-t border-gray-100 dark:border-gray-700 p-1">
                    <button
                      onClick={() => { setPlatforms([]); setPlatformDropdownOpen(false); }}
                      className="w-full px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all text-left cursor-pointer"
                    >
                      Limpar seleção
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          {platforms.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {platforms.map(p => (
                <span key={p} className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-md text-[10px] font-semibold">
                  {PLATFORM_FILTER_OPTIONS.find(o => o.value === p)?.label}
                  <button onClick={() => setPlatforms(prev => prev.filter(x => x !== p))} className="hover:text-blue-200 cursor-pointer">×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium shrink-0">Status:</span>
          <div className="relative" ref={statusDropdownRef}>
            <button
              onClick={() => setStatusDropdownOpen(o => !o)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all min-w-[160px] justify-between cursor-pointer"
            >
              <span>
                {statuses.length === 0
                  ? 'Todos os Status'
                  : statuses.length === 1
                    ? STATUS_FILTER_OPTIONS.find(o => o.value === statuses[0])?.label
                    : `${statuses.length} status`}
              </span>
              <svg className={`w-3 h-3 transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {statusDropdownOpen && (
              <div className="absolute z-50 top-full mt-1 left-0 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl">
                <div className="p-1">
                  {STATUS_FILTER_OPTIONS.map(opt => {
                    const checked = statuses.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setStatuses(prev => prev.includes(opt.value) ? prev.filter(s => s !== opt.value) : [...prev, opt.value])}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all text-left cursor-pointer"
                      >
                        <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${checked ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 dark:border-gray-600'}`}>
                          {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </span>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                {statuses.length > 0 && (
                  <div className="border-t border-gray-100 dark:border-gray-700 p-1">
                    <button
                      onClick={() => { setStatuses([]); setStatusDropdownOpen(false); }}
                      className="w-full px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all text-left cursor-pointer"
                    >
                      Limpar seleção
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          {statuses.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {statuses.map(s => (
                <span key={s} className="flex items-center gap-1 px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-md text-[10px] font-semibold">
                  {STATUS_FILTER_OPTIONS.find(o => o.value === s)?.label}
                  <button onClick={() => setStatuses(prev => prev.filter(x => x !== s))} className="hover:text-indigo-200 cursor-pointer">×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Product filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium shrink-0">Produto:</span>
          <div className="relative" ref={productDropdownRef}>
            <button
              onClick={() => setProductDropdownOpen(o => !o)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all min-w-[200px] justify-between cursor-pointer"
            >
              <span>
                {selectedProducts.length === 0
                  ? 'Todos os Produtos'
                  : selectedProducts.length === 1
                    ? selectedProducts[0]
                    : `${selectedProducts.length} produtos`}
              </span>
              <svg className={`w-3 h-3 transition-transform ${productDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {productDropdownOpen && (
              <div className="absolute z-50 top-full mt-1 left-0 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden">
                <div className="p-1 max-h-64 overflow-y-auto overflow-x-hidden">
                  {(allProducts || []).length === 0 ? (
                    <div className="px-3 py-3 text-xs text-gray-400 dark:text-gray-500 text-center">
                      Nenhum produto encontrado
                    </div>
                  ) : (
                    (allProducts || []).map(productName => {
                      const checked = selectedProducts.includes(productName);
                      return (
                        <button
                          key={productName}
                          onClick={() => {
                            setSelectedProducts(prev =>
                              prev.includes(productName)
                                ? prev.filter(p => p !== productName)
                                : [...prev, productName]
                            );
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all text-left cursor-pointer"
                        >
                          <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${checked ? 'bg-violet-500 border-violet-500' : 'border-gray-300 dark:border-gray-600'}`}>
                            {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                          </span>
                          <span className="truncate" title={productName}>{productName}</span>
                        </button>
                      );
                    })
                  )}
                </div>
                {selectedProducts.length > 0 && (
                  <div className="border-t border-gray-100 dark:border-gray-700 p-1">
                    <button
                      onClick={() => { setSelectedProducts([]); setProductDropdownOpen(false); }}
                      className="w-full px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all text-left cursor-pointer"
                    >
                      Limpar seleção
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          {selectedProducts.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {selectedProducts.map(p => (
                <span key={p} className="flex items-center gap-1 px-2 py-0.5 bg-violet-500/10 text-violet-400 rounded-md text-[10px] font-semibold max-w-[150px]">
                  <span className="truncate" title={p}>{p}</span>
                  <button onClick={() => setSelectedProducts(prev => prev.filter(x => x !== p))} className="hover:text-violet-200 shrink-0 cursor-pointer">×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Payment Method filter */}
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Forma de Pagto:</span>
          {PAYMENT_METHOD_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => {
                setPaymentMethod(opt.value);
                if (onResetTxPage) onResetTxPage();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                paymentMethod === opt.value
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Brasília (GMT-3)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
