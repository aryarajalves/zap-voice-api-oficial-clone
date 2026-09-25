import React from 'react';
import { toast } from 'react-hot-toast';
import {
  FiArchive,
  FiTag,
  FiTrash2,
  FiPlay,
  FiBookmark,
  FiCopy,
  FiEdit2,
  FiDownload
} from 'react-icons/fi';
import { exportFunnelAsJson } from '../../../utils/funnelExportImport';

const hasTemplateNode = (funnel) => funnel.steps?.nodes?.some(n => n.type === 'templateNode');

/**
 * Componente que renderiza um único item/card da lista de funis.
 */
export const FunnelListItem = ({
  funnel,
  logic,
  onEditTag
}) => {
  const isSelected = logic.selectedFunnelIds.includes(funnel.id);
  const isCurrentActive = logic.selectedFunnel?.id === funnel.id;

  const handleTriggerClick = (e) => {
    e.stopPropagation();
    if (hasTemplateNode(funnel)) {
      toast.error("Funis de Template devem ser disparados pela aba 'Disparo em Massa'.", {
        duration: 5000,
        icon: '⚠️'
      });
      return;
    }
    logic.setSelectedFunnel(funnel);
    logic.setIsTriggerModalOpen(true);
  };

  return (
    <div
      className={`group p-4 rounded-xl transition-all border-2 flex justify-between items-center ${
        isCurrentActive
          ? 'border-blue-500 bg-blue-50/10'
          : funnel.is_pinned
            ? 'border-amber-300/50 bg-amber-500/[0.02] dark:border-amber-500/30'
            : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'
      }`}
    >
      <div className="flex items-center gap-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => logic.toggleFunnelSelection(funnel.id, e)}
          onClick={(e) => e.stopPropagation()}
          className="w-5 h-5 text-blue-600 rounded border-gray-300"
        />
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`font-bold text-lg ${isCurrentActive ? 'text-blue-700 dark:text-blue-400' : 'text-gray-800 dark:text-gray-100'}`}>
              {funnel.name}
            </h3>

            {/* Badge de Fixado (Pinned) */}
            {funnel.is_pinned && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-200 dark:border-amber-800/50 flex items-center gap-1 animate-pulse">
                📌 FIXADO
              </span>
            )}

            {/* Badge de Etiqueta (Tag) */}
            {funnel.tag && (
              <span className="px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-[10px] font-bold border border-violet-200 dark:border-violet-800/50">
                🏷️ {funnel.tag}
              </span>
            )}

            {hasTemplateNode(funnel) && (
              <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-[10px] font-bold uppercase border border-purple-200 dark:border-purple-800/50">
                Template
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
            <span>{Array.isArray(funnel.steps) ? funnel.steps.length : (funnel.steps?.nodes?.length || 0)} etapas</span>
            {funnel.trigger_phrase && <span className="text-yellow-600 font-medium">⚡ Gatilho</span>}
            {funnel.created_at && (
              <span className="text-gray-400 dark:text-gray-500">
                • Criado em: {new Date(funnel.created_at).toLocaleString('pt-BR', {
                  timeZone: 'America/Sao_Paulo',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Botão Disparar (somente ativos) */}
        {!funnel.is_archived && (
          <button
            onClick={handleTriggerClick}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              hasTemplateNode(funnel)
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600'
                : 'hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600'
            }`}
            title={hasTemplateNode(funnel) ? "Use o Disparo em Massa" : "Disparar Funil"}
          >
            <FiPlay size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Disparar</span>
          </button>
        )}

        {/* Botão de Etiquetar */}
        <button
          onClick={(e) => onEditTag(funnel, e)}
          className="px-3 py-1.5 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg text-violet-600 flex items-center gap-1.5 transition-all"
          title="Etiquetar Funil"
        >
          <FiTag size={16} />
          <span className="text-xs font-bold uppercase tracking-wider">Etiqueta</span>
        </button>

        {/* Botão de Fixar/Desafixar */}
        {!funnel.is_archived && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              logic.handlePinFunnel(funnel.id, !funnel.is_pinned);
            }}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              funnel.is_pinned
                ? 'hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-600'
                : 'hover:bg-gray-50 dark:hover:bg-gray-800/20 text-gray-500 hover:text-gray-700'
            }`}
            title={funnel.is_pinned ? "Desafixar do Topo" : "Fixar no Topo"}
          >
            <FiBookmark size={16} fill={funnel.is_pinned ? "currentColor" : "none"} />
            <span className="text-xs font-bold uppercase tracking-wider">
              {funnel.is_pinned ? 'Desafixar' : 'Fixar'}
            </span>
          </button>
        )}

        {/* Botão de Arquivar/Desarquivar */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            logic.handleArchiveFunnel(funnel.id, !funnel.is_archived);
          }}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
            funnel.is_archived
              ? 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600'
              : 'hover:bg-yellow-50 dark:hover:bg-yellow-900/20 text-yellow-600'
          }`}
          title={funnel.is_archived ? "Restaurar Funil" : "Arquivar Funil"}
        >
          <FiArchive size={16} />
          <span className="text-xs font-bold uppercase tracking-wider">
            {funnel.is_archived ? 'Restaurar' : 'Arquivar'}
          </span>
        </button>

        {/* Botão de Duplicar */}
        <button
          onClick={(e) => logic.handleDuplicateFunnel(funnel.id, e)}
          className="px-3 py-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg text-indigo-600 flex items-center gap-1.5 transition-all"
          title="Duplicar Funil"
        >
          <FiCopy size={16} />
          <span className="text-xs font-bold uppercase tracking-wider">Duplicar</span>
        </button>

        {/* Botão de Exportar JSON */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            exportFunnelAsJson(funnel);
          }}
          className="px-3 py-1.5 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 rounded-lg text-cyan-600 flex items-center gap-1.5 transition-all"
          title="Exportar Funil em JSON"
          data-testid={`funnel-export-btn-${funnel.id}`}
        >
          <FiDownload size={16} />
          <span className="text-xs font-bold uppercase tracking-wider">Exportar</span>
        </button>

        {/* Botão de Editar */}
        <button
          onClick={(e) => logic.handleEdit(funnel, e)}
          className="px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-blue-600 flex items-center gap-1.5 transition-all"
          title="Editar Funil"
        >
          <FiEdit2 size={16} />
          <span className="text-xs font-bold uppercase tracking-wider">Editar</span>
        </button>

        {/* Botão de Excluir */}
        <button
          onClick={(e) => logic.confirmDelete(funnel.id, e)}
          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-600 transition-all"
          title="Excluir"
        >
          <FiTrash2 size={16} />
        </button>
      </div>
    </div>
  );
};
