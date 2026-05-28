import React from 'react';

export default function TransactionsTable({
  transactions,
  pageSizeTx,
  setPageSizeTx,
  currentPageTx,
  setCurrentPageTx
}) {
  const getStatusBadge = (category, statusText) => {
    const styles = {
      approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
      pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
      refunded: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800',
      canceled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
      other: 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-400 border-gray-200 dark:border-gray-700',
    };
    const style = styles[category] || styles.other;
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${style}`}>
        {statusText}
      </span>
    );
  };

  const totalPages = Math.ceil(transactions.length / pageSizeTx);
  const safeCurrentPage = Math.min(currentPageTx, totalPages || 1);
  const pageRows = transactions.slice((safeCurrentPage - 1) * pageSizeTx, safeCurrentPage * pageSizeTx);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-4">
        <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
          Histórico de Transações
          <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
            ({transactions.length} transaç{transactions.length === 1 ? 'ão' : 'ões'} encontrada{transactions.length === 1 ? '' : 's'})
          </span>
        </h3>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span>Exibir</span>
          <select
            value={pageSizeTx}
            onChange={e => { setPageSizeTx(Number(e.target.value)); setCurrentPageTx(1); }}
            className="px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>por página</span>
        </div>
      </div>

      {transactions.length > 0 ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-6 py-3 font-medium">Data</th>
                  <th className="text-left px-4 py-3 font-medium">Comprador</th>
                  <th className="text-left px-4 py-3 font-medium">Produto</th>
                  <th className="text-right px-4 py-3 font-medium">Valor</th>
                  <th className="text-left px-4 py-3 font-medium">Plataforma</th>
                  <th className="text-left px-4 py-3 font-medium">Forma Pagto</th>
                  <th className="text-center px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((tx, i) => {
                  const dateObj = new Date(tx.created_at);
                  const dateFormatted = dateObj.toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  return (
                    <tr
                      key={tx.id}
                      className={`border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-gray-800/30'}`}
                    >
                      <td className="px-6 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {dateFormatted}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                        {tx.buyer_name}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-[200px] truncate">
                        {tx.product_name}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">
                        R$ {tx.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs uppercase font-bold">
                          {tx.platform}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {tx.payment_method || '—'}
                      </td>
                      <td className="px-6 py-3 text-center whitespace-nowrap">
                        {getStatusBadge(tx.category, tx.status)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-4">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Mostrando {(safeCurrentPage - 1) * pageSizeTx + 1}–{Math.min(safeCurrentPage * pageSizeTx, transactions.length)} de {transactions.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPageTx(1)}
                  disabled={safeCurrentPage === 1}
                  className="px-2 py-1 rounded text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  «
                </button>
                <button
                  onClick={() => setCurrentPageTx(p => Math.max(1, p - 1))}
                  disabled={safeCurrentPage === 1}
                  className="px-3 py-1 rounded text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>

                <span className="px-3 py-1 text-xs text-gray-500 dark:text-gray-400 font-medium">
                  Página {safeCurrentPage} de {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPageTx(p => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="px-3 py-1 rounded text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Próxima
                </button>
                <button
                  onClick={() => setCurrentPageTx(totalPages)}
                  disabled={safeCurrentPage === totalPages}
                  className="px-2 py-1 rounded text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  »
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          Nenhuma transação encontrada para os filtros selecionados.
        </div>
      )}
    </div>
  );
}
