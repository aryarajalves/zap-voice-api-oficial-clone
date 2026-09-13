import React from 'react';
import { FiFolder } from 'react-icons/fi';
import TemplatePreview from '../../../BulkSender/common/TemplatePreview';

export default function ViewMessageModalViewMode({
  sendType,
  directMessage,
  selectedFunnelId,
  funnels = [],
  selectedTemplateName,
  selectedTemplateObj,
  templateParams
}) {
  return (
    <div className="space-y-6">
      {sendType === 'direct_message' && (
        <div className="space-y-4">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
            Mensagem Direta (Texto)
          </div>
          <div className="bg-slate-950 p-6 rounded-[2rem] border border-white/5 shadow-inner leading-relaxed text-sm text-slate-200 whitespace-pre-wrap font-medium">
            {directMessage || <span className="italic text-slate-600">Nenhum texto preenchido.</span>}
          </div>
        </div>
      )}

      {sendType === 'funnel' && (
        <div className="space-y-4">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
            Funil de Automação
          </div>
          <div className="p-6 bg-slate-950 rounded-[2rem] border border-white/5 flex items-center gap-4 shadow-inner">
            <div className="w-12 h-12 bg-purple-500/10 rounded-2xl border border-purple-500/20 flex items-center justify-center text-purple-400">
              <FiFolder size={20} />
            </div>
            <div>
              <div className="text-sm font-black text-white">
                {funnels.find(f => String(f.id) === String(selectedFunnelId))?.name || 'Funil não selecionado'}
              </div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                Disparará todos os blocos configurados no funil
              </div>
            </div>
          </div>
        </div>
      )}

      {sendType === 'template' && (
        <div className="space-y-4">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
            Template WhatsApp: <span className="text-white font-black">{selectedTemplateName}</span>
          </div>
          {selectedTemplateObj ? (
            <TemplatePreview template={selectedTemplateObj} params={templateParams} />
          ) : (
            <div className="text-center py-10 bg-slate-950 border border-white/5 rounded-3xl text-xs font-bold text-slate-500 uppercase tracking-widest italic">
              Carregando pré-visualização do template...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
