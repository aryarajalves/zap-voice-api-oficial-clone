import React from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiActivity, FiZap, FiCheck, FiSettings, FiClock, FiCpu } from 'react-icons/fi';
import PipelineCountdown from './PipelineCountdown';

const PipelineModal = ({ isOpen, onClose, dispatch }) => {
  if (!isOpen || !dispatch) return null;

  const pipeline = dispatch.pipeline_steps || [];

  return createPortal(
    <div className="fixed inset-0 z-[12000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#1e293b] border border-white/5 rounded-[2.5rem] w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-[#0f172a]/80 backdrop-blur">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
              <FiActivity size={28} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white tracking-tight uppercase">Monitor de Pipeline</h3>
              <p className="text-gray-500 text-xs mt-1 font-bold tracking-widest uppercase">
                {dispatch.contact_name || dispatch.contact_phone} • {dispatch.event_type}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-10 custom-scrollbar bg-[#0f172a]/50">
          <div className="max-w-2xl mx-auto">
            {/* Status Geral Card */}
            <div className="mb-10 p-6 bg-gradient-to-br from-indigo-500/10 to-blue-500/5 rounded-3xl border border-indigo-500/20 flex items-center justify-between shadow-xl">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${dispatch.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'} border border-white/5`}>
                   <FiZap size={24} fill="currentColor" className={dispatch.status === 'processing' ? 'animate-pulse' : ''} />
                </div>
                <div>
                  <span className="text-[10px] font-black text-indigo-400/80 uppercase tracking-[0.2em]">Status do Pipeline</span>
                  <h4 className="text-xl font-black text-white capitalize">{dispatch.status === 'completed' ? 'Finalizado com Sucesso' : dispatch.status}</h4>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Agendado para</span>
                <span className="font-mono text-white font-bold text-lg">{new Date(dispatch.scheduled_time).toLocaleString()}</span>
              </div>
            </div>

            {/* Stepper Vertical */}
            <div className="relative pl-10 space-y-12">
              {/* Linha Vertical do Stepper */}
              <div className="absolute left-[20px] top-4 bottom-4 w-1 bg-gradient-to-b from-indigo-500 via-blue-500 to-gray-800 rounded-full opacity-20"></div>

              {pipeline.length === 0 ? (
                <div className="flex flex-col items-center py-10 opacity-30">
                  <FiCpu size={48} className="text-gray-500 mb-4" />
                  <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Aguardando início do processamento...</p>
                </div>
              ) : (
                pipeline.map((step, idx) => (
                  <div key={idx} className="relative group animate-in slide-in-from-left-4 duration-500" style={{ animationDelay: `${idx * 150}ms` }}>
                    {/* Indicador de Passo */}
                    <div className={`absolute -left-[54px] top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all duration-500 z-10 ${step.status === 'completed' ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30' : 'bg-[#0b1120] border-white/10 text-gray-500 group-hover:border-indigo-500/50'}`}>
                      {step.status === 'completed' ? <FiCheck size={16} /> : <span className="text-[10px] font-black">{idx + 1}</span>}
                    </div>

                    {/* Conteúdo do Passo */}
                    <div className={`p-6 rounded-[2rem] border transition-all duration-500 shadow-inner ${step.status === 'completed' ? 'bg-white/[0.03] border-white/10' : 'bg-[#0b1120]/50 border-white/5 opacity-50'}`}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <h5 className={`text-sm font-black uppercase tracking-widest ${step.status === 'completed' ? 'text-white' : 'text-gray-500'}`}>{step.name}</h5>
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tight ${step.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-800 text-gray-600'}`}>
                            {step.status}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-gray-600 font-bold">
                          {step.timestamp ? new Date(step.timestamp).toLocaleTimeString() : '--:--:--'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 font-medium leading-relaxed">{step.description}</p>
                      
                      {step.metadata && Object.keys(step.metadata).length > 0 && (
                        <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
                           {Object.entries(step.metadata).map(([k, v]) => (
                             <div key={k} className="flex flex-col">
                               <span className="text-[9px] font-black text-gray-600 uppercase tracking-tighter mb-0.5">{k.replace('_', ' ')}</span>
                               <span className="text-[10px] font-mono text-indigo-300 font-bold truncate" title={String(v)}>{String(v)}</span>
                             </div>
                           ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}

              {/* Countdown Step (se ainda pendente) */}
              {dispatch.status === 'pending' && new Date(dispatch.scheduled_time) > new Date() && (
                <div className="relative animate-in zoom-in duration-700">
                  <div className="absolute -left-[54px] top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-orange-500 border-2 border-orange-300 text-white flex items-center justify-center animate-pulse z-10 shadow-lg shadow-orange-500/30">
                    <FiClock size={16} />
                  </div>
                  <div className="p-8 rounded-[2rem] bg-orange-500/5 border-2 border-dashed border-orange-500/20 flex flex-col items-center text-center">
                    <PipelineCountdown targetTime={dispatch.scheduled_time} />
                    <p className="text-[10px] text-orange-400 font-black uppercase tracking-widest mt-4">
                      Aguardando momento exato do disparo agendado
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-white/5 bg-[#0f172a] flex justify-center px-12">
          <button
            onClick={onClose}
            className="px-12 py-4 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-2xl font-black transition-all active:scale-95 text-xs uppercase tracking-[0.3em] border border-white/10"
          >
            Fechar Monitor
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PipelineModal;
