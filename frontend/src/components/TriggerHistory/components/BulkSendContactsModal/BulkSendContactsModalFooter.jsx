import React from 'react';

export default function BulkSendContactsModalFooter({
  onClose,
  handleSend,
  isSending,
  selectedTemplate,
  isScheduleEnabled
}) {
  return (
    <div className="p-6 border-t border-slate-800 bg-slate-950/40 flex justify-end gap-3">
      <button
        onClick={onClose}
        className="px-5 py-2.5 bg-slate-800 text-slate-300 rounded-2xl hover:bg-slate-700 hover:text-white transition text-xs font-bold uppercase tracking-widest"
        disabled={isSending}
      >
        Cancelar
      </button>
      <button
        onClick={handleSend}
        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl transition text-xs font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20"
        disabled={isSending || !selectedTemplate}
      >
        {isSending ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Enviando...
          </>
        ) : isScheduleEnabled ? (
          'Agendar Disparo'
        ) : (
          'Enviar Disparo'
        )}
      </button>
    </div>
  );
}
