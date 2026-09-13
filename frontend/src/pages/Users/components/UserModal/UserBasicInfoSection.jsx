import React from 'react';
import { FiLink, FiCopy, FiCheck } from 'react-icons/fi';

const UserBasicInfoSection = ({
  editingUser,
  userData,
  setUserData,
  validityHours,
  setValidityHours,
  resetLink,
  resetCopied,
  isGeneratingReset,
  onGenerateResetLink,
  onCopyResetLink
}) => {
  if (editingUser) {
    return (
      <>
        <div>
          <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">
            Nome Completo
          </label>
          <input
            required
            type="text"
            name="new-user-name"
            autoComplete="off"
            value={userData.full_name}
            onChange={(e) => setUserData({ ...userData, full_name: e.target.value })}
            className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white outline-none transition-all"
            placeholder="Ex: João Silva"
          />
        </div>

        <div>
          <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">
            Email das Boas-vindas
          </label>
          <input
            required
            type="email"
            name="new-user-email"
            autoComplete="off"
            value={userData.email}
            onChange={(e) => setUserData({ ...userData, email: e.target.value })}
            className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white outline-none transition-all"
            placeholder="exemplo@email.com"
          />
        </div>

        {/* Redefinição de Senha via Link para o Usuário */}
        <div className="p-3.5 bg-gray-50 dark:bg-[#0f172a] rounded-xl border border-gray-200 dark:border-gray-700/70 space-y-2">
          <div>
            <label className="block text-xs font-black text-gray-700 dark:text-gray-200 uppercase tracking-wider">
              Redefinição de Senha
            </label>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              Gere um link para que o usuário crie uma nova senha para a conta dele.
            </p>
          </div>

          {resetLink ? (
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700/60 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={resetLink}
                  className="w-full text-xs p-2 bg-white dark:bg-[#1e293b] border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-mono select-all outline-none"
                />
                <button
                  type="button"
                  onClick={onCopyResetLink}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    resetCopied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20'
                  }`}
                >
                  {resetCopied ? <FiCheck size={14} /> : <FiCopy size={14} />}
                  <span>{resetCopied ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span>⏱️ Válido por 24 horas</span>
                <button
                  type="button"
                  onClick={onGenerateResetLink}
                  className="text-blue-500 hover:text-blue-400 font-medium cursor-pointer"
                >
                  Gerar Novo Link
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onGenerateResetLink}
              disabled={isGeneratingReset}
              className="w-full py-2.5 px-3 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isGeneratingReset ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Gerando link...</span>
                </>
              ) : (
                <>
                  <FiLink size={14} />
                  <span>Criar Link de Nova Senha</span>
                </>
              )}
            </button>
          )}
        </div>
      </>
    );
  }

  return (
    <div>
      <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">
        Prazo de Validade do Convite
      </label>
      <select
        value={validityHours}
        onChange={(e) => setValidityHours(Number(e.target.value))}
        className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white outline-none font-medium"
      >
        <option value={7}>7 Horas</option>
        <option value={14}>14 Horas</option>
        <option value={24}>24 Horas</option>
        <option value={48}>48 Horas</option>
        <option value={72}>72 Horas</option>
        <option value={0}>Sem Expiração</option>
      </select>
    </div>
  );
};

export default UserBasicInfoSection;
