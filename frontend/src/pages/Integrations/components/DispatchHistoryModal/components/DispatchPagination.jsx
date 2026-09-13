import React from 'react';
import { FiChevronDown } from 'react-icons/fi';

const DispatchPagination = ({
  dispatchLimit,
  setDispatchLimit,
  dispatchPage,
  setDispatchPage,
  dispatchTotal,
  totalPages
}) => {
  return (
    <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-6 pb-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Mostrar:</span>
          <select
            value={dispatchLimit}
            onChange={(e) => {
              setDispatchLimit(Number(e.target.value));
              setDispatchPage(1);
            }}
            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-indigo-500/50 cursor-pointer"
          >
            <option value="20" className="bg-[#0b1120]">20</option>
            <option value="50" className="bg-[#0b1120]">50</option>
            <option value="100" className="bg-[#0b1120]">100</option>
          </select>
        </div>
        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
          Total: <span className="text-white">{dispatchTotal}</span> registros
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setDispatchPage(prev => Math.max(1, prev - 1))}
          disabled={dispatchPage === 1}
          className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
        >
          <FiChevronDown className="rotate-90" />
        </button>

        <div className="flex items-center gap-1">
          {[...Array(totalPages)].map((_, i) => {
            const p = i + 1;
            if (
              p === 1 ||
              p === totalPages ||
              (p >= dispatchPage - 2 && p <= dispatchPage + 2)
            ) {
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setDispatchPage(p)}
                  className={`w-10 h-10 rounded-xl text-[11px] font-black transition-all active:scale-90 ${
                    dispatchPage === p
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'
                  }`}
                >
                  {p}
                </button>
              );
            }
            if (p === dispatchPage - 3 || p === dispatchPage + 3) {
              return <span key={p} className="text-gray-600">...</span>;
            }
            return null;
          })}
        </div>

        <button
          type="button"
          onClick={() => setDispatchPage(prev => Math.max(1, Math.min(totalPages, prev + 1)))}
          disabled={dispatchPage >= totalPages}
          className="p-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all disabled:opacity-20 disabled:cursor-not-allowed group/btn"
        >
          <FiChevronDown className="-rotate-90" />
        </button>
      </div>
    </div>
  );
};

export default DispatchPagination;
