import React from 'react';
import { FiPlay } from 'react-icons/fi';

const DispatchModalHeader = ({ integrationName }) => {
  return (
    <div className="p-5 border-b border-white/5 flex justify-between items-center bg-[#0f172a]/80 backdrop-blur shrink-0">
      <div>
        <h3 className="text-xl font-black text-white flex items-center gap-3 tracking-tight">
          <div className="p-1.5 bg-indigo-500/10 rounded-lg">
            <FiPlay className="text-indigo-400" size={18} />
          </div>
          Histórico de Disparos: {integrationName}
        </h3>
        <p className="text-gray-500 text-[10px] mt-1 font-medium bg-white/5 px-2 py-0.5 rounded-lg inline-block">
          Acompanhe a fila de execução de templates e funis
        </p>
      </div>
    </div>
  );
};

export default DispatchModalHeader;
