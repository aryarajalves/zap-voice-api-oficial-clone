import React from 'react';
import { FiFileText, FiEdit2, FiCheck, FiX, FiClock, FiEye, FiLoader, FiCheckCircle, FiAlertTriangle, FiTrash } from 'react-icons/fi';
import { parseDateSafe } from '../../utils/importHistoryUtils';

function formatDuration(seconds) {
  if (!isFinite(seconds) || seconds < 0) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function ImportHistoryCard({
  item,
  isSelected,
  onSelectItem,
  editingId,
  setEditingId,
  editName,
  setEditName,
  renaming,
  onRename,
  startInfo,
  onOpenResultsModal,
  onOpenDeleteModal
}) {
  const totalRows = item.total_rows || 0;
  const importedRows = item.imported_rows || 0;
  const errorRows = item.error_rows || 0;
  const processed = importedRows + errorRows;
  const percentage = totalRows > 0 ? Math.min(Math.round((processed / totalRows) * 100), 100) : 0;

  // Cronômetro e ETA
  let elapsedStr = null;
  if (item.status === 'processing' && startInfo) {
    const elapsedSec = (Date.now() - startInfo.time) / 1000;
    elapsedStr = formatDuration(elapsedSec);
  }

  const isFinished = item.status === 'completed' || item.status === 'failed';
  const dateLabel = isFinished ? 'Concluída em' : 'Iniciada em';
  const dateSource = isFinished && item.updated_at ? item.updated_at : item.created_at;
  const dateStr = parseDateSafe(dateSource);

  const rejectedDuplicates = item.rejected_duplicate_rows || 0;
  const rejectedInvalidPhone = item.rejected_invalid_phone_rows || 0;
  const originalTotalRows = item.original_total_rows || 0;
  const hasDetails = (importedRows + errorRows + rejectedDuplicates + rejectedInvalidPhone) > 0;

  return (
    <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:bg-white/10 dark:hover:bg-gray-800/10 transition-all">
      <div className="flex items-start gap-4 flex-1">
        <div className="flex items-center h-12">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelectItem(item.id, e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-700 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
          />
        </div>

        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-100 dark:border-blue-800/20 shrink-0">
          <FiFileText size={24} />
        </div>

        <div className="space-y-2 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            {editingId === item.id ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="px-3 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome da lista"
                />
                <button
                  disabled={renaming}
                  onClick={() => onRename(item.id)}
                  className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                  title="Salvar"
                >
                  <FiCheck size={16} />
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="p-1.5 bg-gray-150 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer"
                  title="Cancelar"
                >
                  <FiX size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                  {item.filename}
                </h3>
                <button
                  onClick={() => {
                    setEditingId(item.id);
                    setEditName(item.filename);
                  }}
                  className="p-1 text-gray-400 hover:text-blue-500 rounded-lg transition-colors cursor-pointer"
                  title="Renomear lista"
                >
                  <FiEdit2 size={14} />
                </button>
              </div>
            )}

            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {dateLabel}: {dateStr}
            </span>
          </div>

          {/* Progress details */}
          {(item.status === 'processing' || item.status === 'pending' || item.status === 'completed') && (totalRows > 0 || originalTotalRows > 0 || hasDetails) && (
            <div className="space-y-2 max-w-xl">
              {totalRows > 0 ? (
                <>
                  <div className="w-full bg-gray-100 dark:bg-gray-700/50 rounded-full h-2 overflow-hidden shadow-inner">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        item.status === 'completed' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]'
                      }`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-gray-500 dark:text-gray-400">
                    <span className={item.status === 'completed' ? 'text-emerald-500' : 'text-blue-500'}>
                      {percentage}% Concluído
                    </span>
                    <span>•</span>
                    <span>
                      {processed.toLocaleString('pt-BR')} de {totalRows.toLocaleString('pt-BR')} contatos
                      {originalTotalRows > totalRows && (
                        <span className="text-gray-400 font-normal"> (arquivo tinha {originalTotalRows.toLocaleString('pt-BR')} linhas)</span>
                      )}
                    </span>
                    {errorRows > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-red-500">{errorRows.toLocaleString('pt-BR')} erros</span>
                      </>
                    )}
                    {item.status === 'processing' && elapsedStr && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-gray-400">
                          <FiClock size={11} /> {elapsedStr} decorridos
                        </span>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 text-xs font-medium text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                  <span>⚠ Nenhum contato válido importado (arquivo com {originalTotalRows.toLocaleString('pt-BR')} linhas)</span>
                </div>
              )}

              {/* Resumo final quando concluído */}
              {item.status === 'completed' && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {importedRows > 0 && (
                    <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/30 rounded-lg text-[11px] font-bold">
                      ✓ {importedRows.toLocaleString('pt-BR')} importados com sucesso
                    </span>
                  )}
                  {errorRows > 0 && (
                    <span className="px-2.5 py-1 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800/20 rounded-lg text-[11px] font-bold">
                      ✗ {errorRows.toLocaleString('pt-BR')} falharam
                    </span>
                  )}
                  {rejectedDuplicates > 0 && (
                    <span className="px-2.5 py-1 bg-gray-50 dark:bg-gray-700/30 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700/40 rounded-lg text-[11px] font-bold">
                      ⊘ {rejectedDuplicates.toLocaleString('pt-BR')} duplicados no arquivo
                    </span>
                  )}
                  {rejectedInvalidPhone > 0 && (
                    <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800/20 rounded-lg text-[11px] font-bold">
                      ⚠ {rejectedInvalidPhone.toLocaleString('pt-BR')} telefone inválido
                    </span>
                  )}
                  {hasDetails && (
                    <button
                      onClick={() => onOpenResultsModal(item)}
                      className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/30 rounded-lg text-[11px] font-bold hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <FiEye size={11} /> Ver quem foi importado/rejeitado
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {item.status === 'failed' && (
            <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/20 rounded-xl max-w-xl flex items-start gap-2 text-red-600 dark:text-red-400 text-xs">
              <FiAlertTriangle className="shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Falha no processamento:</p>
                <p className="mt-0.5 font-medium">{item.error_message || 'Erro indefinido.'}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 flex items-center justify-end gap-3">
        <div className="flex flex-col items-end gap-1.5">
          {item.status === 'pending' && (
            <span className="px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800/30 rounded-xl text-xs font-bold flex items-center gap-2">
              <FiLoader className="animate-spin" size={14} /> Aguardando fila
            </span>
          )}
          {item.status === 'processing' && (
            <span className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/30 rounded-xl text-xs font-bold flex items-center gap-2">
              <FiLoader className="animate-spin" size={14} /> Importando...
            </span>
          )}
          {item.status === 'completed' && (
            <span className="px-3 py-1.5 bg-emerald-50/80 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/30 rounded-xl text-xs font-bold flex items-center gap-2">
              <FiCheckCircle size={14} /> Concluída
            </span>
          )}
          {item.status === 'failed' && (
            <span className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800/30 rounded-xl text-xs font-bold flex items-center gap-2">
              <FiAlertTriangle size={14} /> Importação Falhou
            </span>
          )}
        </div>

        <button
          onClick={() => onOpenDeleteModal(item.id)}
          className="p-2 hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-400 hover:text-red-650 rounded-xl transition-all cursor-pointer"
          title="Deletar este histórico"
        >
          <FiTrash size={16} />
        </button>
      </div>
    </div>
  );
}
