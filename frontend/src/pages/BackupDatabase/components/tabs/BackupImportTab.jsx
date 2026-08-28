import React from 'react';
import { FiDownloadCloud, FiRefreshCw, FiUploadCloud, FiInfo, FiCheckCircle } from 'react-icons/fi';

export const BackupImportTab = ({
  handleUploadBackup,
  isUploading,
  isRestoring,
  isRunning
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 pb-6 border-b border-gray-100 dark:border-gray-700 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
            <FiUploadCloud size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
              Importação de Backup Externo
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Envie arquivos de dump de outros ambientes para o Backblaze S3 e restaure seus dados quando desejar.
            </p>
          </div>
        </div>

        {/* Dropzone / Upload Box */}
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-amber-500 dark:hover:border-amber-500/80 rounded-2xl p-8 text-center transition-all bg-gray-50/50 dark:bg-gray-900/20 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
            <FiDownloadCloud size={28} className={isUploading ? 'animate-bounce' : ''} />
          </div>

          <div className="space-y-1 max-w-md">
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">
              Selecione o arquivo de backup do PostgreSQL
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Formatos aceitos: arquivos comprimidos <strong>.dump.gz</strong> ou formato raw <strong>.dump</strong>.
            </p>
          </div>

          <label
            htmlFor="upload-backup-file"
            className={`flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 cursor-pointer ${
              isUploading || isRestoring || isRunning ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''
            }`}
          >
            {isUploading ? (
              <>
                <FiRefreshCw size={18} className="animate-spin" />
                Enviando Arquivo para o S3...
              </>
            ) : (
              <>
                <FiUploadCloud size={18} />
                Fazer Upload de Backup
              </>
            )}
            <input
              id="upload-backup-file"
              type="file"
              accept=".dump,.gz"
              onChange={handleUploadBackup}
              disabled={isUploading || isRestoring || isRunning}
              className="hidden"
            />
          </label>
        </div>

        {/* Informações e Instruções */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              <FiCheckCircle className="text-emerald-500" size={14} />
              <span>O que acontece após o upload?</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              O arquivo é enviado diretamente para o seu bucket do Backblaze S3 e passa a aparecer imediatamente na aba <strong>Backups no S3</strong> com tamanho, data e opção de restauração rápida.
            </p>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-800/40 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider">
              <FiInfo className="text-blue-500" size={14} />
              <span>Dica de Migração</span>
            </div>
            <p className="text-xs text-blue-900 dark:text-blue-300 leading-relaxed">
              Para migrar de outro servidor VPS ou máquina local, gere o dump do Postgres com <code>pg_dump -Fc</code> ou baixe o arquivo de backup e faça o upload aqui para restaurar todo o banco.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackupImportTab;
