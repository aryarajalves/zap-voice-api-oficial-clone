import React from 'react';
import { FiUsers, FiSearch, FiTrash2 } from 'react-icons/fi';

export default function CapturePageLeadsTab({
  leads = [],
  loadingLeads,
  search,
  setSearch,
  onSearchChange,
  onOpenDeleteModal
}) {
  return (
    <div className="bg-[#0d1520] p-6 rounded-2xl border border-gray-800 space-y-4 shadow-xl">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <FiUsers /> Leads Capturados nesta Página
        </h3>

        <div className="relative w-full md:w-64">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por e-mail..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              onSearchChange(e.target.value);
            }}
            className="w-full bg-[#060a0f] border border-gray-800 text-xs text-white rounded-xl pl-9 pr-3 py-2 focus:border-emerald-500 outline-none"
          />
        </div>
      </div>

      {loadingLeads ? (
        <div className="p-8 text-center text-gray-400">Buscando lista de e-mails...</div>
      ) : leads.length === 0 ? (
        <div className="p-8 text-center text-gray-500 text-xs bg-[#060a0f] rounded-xl border border-gray-800/50">
          Nenhum lead capturado até o momento.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="py-3 px-4">E-mail Registrado</th>
                <th className="py-3 px-4">Data de Cadastro</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {leads.map((l) => (
                <tr key={l.id} className="hover:bg-gray-800/30 transition-all">
                  <td className="py-3 px-4 font-mono text-emerald-400 font-semibold">{l.email}</td>
                  <td className="py-3 px-4 text-gray-400">
                    {l.created_at ? new Date(l.created_at).toLocaleString('pt-BR') : '-'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => onOpenDeleteModal(l)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                      title="Excluir Lead"
                    >
                      <FiTrash2 />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
