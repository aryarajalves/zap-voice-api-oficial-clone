import React from 'react';
import { FiCheckCircle, FiAlertCircle, FiDatabase, FiClock, FiShield } from 'react-icons/fi';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

export function StatusCard({ config }) {
  const statusOk = config?.last_backup_status === 'success';
  const statusErr = config?.last_backup_status === 'error';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Último Backup */}
      <div className="bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/50 rounded-2xl p-5 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-3">
          {statusOk && <FiCheckCircle size={20} className="text-emerald-500" />}
          {statusErr && <FiAlertCircle size={20} className="text-red-500" />}
          {!config?.last_backup_status && <FiDatabase size={20} className="text-gray-400" />}
          <span className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">Último Backup</span>
        </div>
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
          {config?.last_backup_filename || 'Nenhum backup realizado'}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {formatDate(config?.last_backup_at)}
        </p>
        {statusErr && (
          <p className="text-xs text-red-500 mt-2 truncate" title={config.last_backup_error}>
            ⚠️ {config.last_backup_error}
          </p>
        )}
      </div>

      {/* Próximo Backup */}
      <div className="bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/50 rounded-2xl p-5 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-3">
          <FiClock size={20} className="text-blue-400" />
          <span className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">Próximo Backup</span>
        </div>
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          {config?.enabled && config?.next_backup_at
            ? formatDate(config.next_backup_at)
            : config?.enabled && config?.interval_type === 'manual'
              ? 'Somente Manual'
              : 'Agendamento Desativado'
          }
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {config?.enabled
            ? config?.interval_type !== 'manual'
              ? `A cada ${config.interval_value} ${config.interval_type === 'hours' ? 'hora(s)' : 'dia(s)'}`
              : 'Apenas backup manual'
            : 'Agendamento inativo'
          }
        </p>
      </div>

      {/* Retenção */}
      <div className="bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/50 rounded-2xl p-5 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-3">
          <FiShield size={20} className="text-violet-400" />
          <span className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">Retenção</span>
        </div>
        <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          {config?.retention_count ?? 30}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">backups mantidos no S3</p>
      </div>
    </div>
  );
}
