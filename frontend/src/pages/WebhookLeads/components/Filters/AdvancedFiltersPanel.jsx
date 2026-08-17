import React from 'react';
import { FiFilter } from 'react-icons/fi';
import { formatDddOption, formatDdiOption } from '../../../../utils/dddInfo';
import FilterSelect from '../FilterSelect';

export default function AdvancedFiltersPanel({
  importedByClientId,
  setImportedByClientId,
  origin,
  setOrigin,
  lockedFilter,
  setLockedFilter,
  blockStatusFilter,
  setBlockStatusFilter,
  bsudFilter,
  setBsudFilter,
  filterDdi,
  setFilterDdi,
  filterDdd,
  setFilterDdd,
  ddiOptions = [],
  dddOptions = [],
  blockStatusOptions = [],
  availableFilters = {}
}) {
  return (
    <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-fadeIn">
      {/* Criado por */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider pl-1">
          Criado por
        </label>
        <FilterSelect
          icon={FiFilter}
          placeholder="Todos os Criadores"
          value={importedByClientId}
          onChange={setImportedByClientId}
          color="blue"
          options={(availableFilters.imported_by_clients || []).map(c => ({ value: c.id, label: `👤 ${c.name}` }))}
        />
      </div>

      {/* Origem */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider pl-1">
          Origem
        </label>
        <FilterSelect
          icon={FiFilter}
          placeholder="Todas as Origens"
          value={origin}
          onChange={setOrigin}
          color="blue"
          searchable={false}
          options={[
            { value: 'manual', label: '👤 Criado Manualmente' },
            { value: 'manual_bulk', label: '📥 Importado por Planilha (CSV)' },
            { value: 'webhook', label: '🔗 Criado via Webhook' },
          ]}
        />
      </div>

      {/* Status de Proteção */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider pl-1">
          Proteção de Exclusão
        </label>
        <FilterSelect
          icon={FiFilter}
          placeholder="Todos os Status"
          value={lockedFilter}
          onChange={setLockedFilter}
          color="blue"
          searchable={false}
          options={[
            { value: 'true', label: '🔒 Protegidos' },
            { value: 'false', label: '🔓 Não Protegidos' },
          ]}
        />
      </div>

      {/* Status de Bloqueio/Repouso */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider pl-1">
          Bloqueio / Repouso
        </label>
        <FilterSelect
          icon={FiFilter}
          placeholder="Todos os Status"
          value={blockStatusFilter}
          onChange={setBlockStatusFilter}
          color="blue"
          searchable={false}
          disabled={blockStatusOptions.length === 0}
          options={blockStatusOptions}
        />
      </div>

      {/* BSUD */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider pl-1">
          Fallback (BSUD)
        </label>
        <FilterSelect
          icon={FiFilter}
          placeholder="Todos (BSUD)"
          value={bsudFilter}
          onChange={setBsudFilter}
          color="blue"
          searchable={false}
          options={[
            { value: 'true', label: '💬 Com BSUD (nº fallback)' },
            { value: 'false', label: '⚠️ Sem BSUD' },
          ]}
        />
      </div>

      {/* DDI */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider pl-1">
          DDI (País)
        </label>
        <FilterSelect
          icon={FiFilter}
          placeholder="Todos os DDIs"
          value={filterDdi}
          onChange={setFilterDdi}
          color="green"
          disabled={ddiOptions.length === 0}
          options={ddiOptions.map(ddi => ({ value: ddi, label: formatDdiOption(ddi) }))}
        />
      </div>

      {/* DDD */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider pl-1">
          DDD (Estado)
        </label>
        <FilterSelect
          icon={FiFilter}
          placeholder="Todos os DDDs"
          value={filterDdd}
          onChange={setFilterDdd}
          color="green"
          disabled={dddOptions.length === 0}
          options={dddOptions.map(ddd => ({ value: ddd, label: formatDddOption(ddd) }))}
        />
      </div>
    </div>
  );
}
