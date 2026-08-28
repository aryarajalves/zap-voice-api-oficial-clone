import React from 'react';
import { FiCalendar, FiSettings, FiRefreshCw, FiClock, FiFolder } from 'react-icons/fi';

export const BackupScheduleTab = ({
  enabled,
  setEnabled,
  intervalType,
  setIntervalType,
  intervalValue,
  setIntervalValue,
  s3Folder,
  setS3Folder,
  retentionCount,
  setRetentionCount,
  handleSaveConfig,
  isSaving,
  isRestoring,
  isUploading
}) => {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-700 mb-5">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500 border border-violet-500/20">
            <FiCalendar size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">
              Rotina de Agendamento Automático
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Configure a periodicidade de execução do robô de backup e o limite de retenção no armazenamento S3.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveConfig} className="space-y-4">
          {/* Switch de Ativação */}
          <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${enabled ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
              <div>
                <p className="text-xs font-bold text-gray-800 dark:text-gray-100">
                  {enabled ? 'Agendamento Ativado' : 'Agendamento Desativado'}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {enabled ? 'Backups periódicos são criados e enviados automaticamente.' : 'Backups só serão executados quando disparados manualmente.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              id="toggle-backup-enabled"
              onClick={() => setEnabled(v => !v)}
              disabled={isRestoring || isUploading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                enabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Frequência e Intervalo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Frequência de Execução
              </label>
              <select
                id="select-interval-type"
                value={intervalType}
                onChange={e => setIntervalType(e.target.value)}
                disabled={!enabled || isRestoring || isUploading}
                className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50 cursor-pointer"
              >
                <option value="manual" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Somente Manual</option>
                <option value="hours" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">A cada X horas</option>
                <option value="days" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">A cada X dias</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Valor do Intervalo
              </label>
              <input
                id="input-interval-value"
                type="number"
                min={1}
                max={9999}
                value={intervalValue}
                onChange={e => setIntervalValue(e.target.value)}
                disabled={!enabled || intervalType === 'manual' || isRestoring || isUploading}
                className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
              />
              {intervalType !== 'manual' && enabled && (
                <p className="text-[11px] text-blue-500 dark:text-blue-400 mt-1 flex items-center gap-1">
                  <FiClock size={12} />
                  Executar backup a cada <strong>{intervalValue}</strong> {intervalType === 'hours' ? 'hora(s)' : 'dia(s)'}.
                </p>
              )}
            </div>
          </div>

          {/* Subpasta S3 */}
          <div>
            <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              Pasta do Backup no S3
            </label>
            <input
              id="input-s3-folder"
              type="text"
              placeholder="Ex: backups/"
              value={s3Folder}
              onChange={e => setS3Folder(e.target.value)}
              disabled={isRestoring || isUploading}
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
            />
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
              <FiFolder size={12} />
              Diretório raiz no bucket onde os arquivos serão organizados. Ex: <code>backups/</code> ou <code>backups/servidor-principal/</code>.
            </p>
          </div>

          {/* Retenção de Backups */}
          <div className="p-3.5 bg-violet-50 dark:bg-violet-950/20 rounded-xl border border-violet-200 dark:border-violet-800/40 space-y-1.5">
            <label className="block text-[11px] font-bold text-violet-900 dark:text-violet-300 uppercase tracking-wider">
              Política de Retenção Máxima (S3)
            </label>
            <div className="flex items-center gap-3">
              <input
                id="input-retention-count"
                type="number"
                min={1}
                max={365}
                value={retentionCount}
                onChange={e => setRetentionCount(e.target.value)}
                disabled={isRestoring || isUploading}
                className="w-24 px-3 py-1.5 rounded-xl border border-violet-300 dark:border-violet-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-xs font-bold focus:ring-2 focus:ring-violet-500 outline-none"
              />
              <p className="text-[11px] text-violet-800 dark:text-violet-300">
                backups mantidos. Ao ultrapassar essa quantidade, os mais antigos serão deletados automaticamente (exceto fixados).
              </p>
            </div>
          </div>

          {/* Botão de Salvar */}
          <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-700">
            <button
              id="btn-save-backup-config"
              type="submit"
              disabled={isSaving || isRestoring || isUploading}
              className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <FiRefreshCw size={14} className="animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <FiSettings size={14} />
                  Salvar Configuração
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BackupScheduleTab;
