import React from 'react';
import { createPortal } from 'react-dom';
import { FiFileText, FiZap, FiMaximize2, FiX } from 'react-icons/fi';
import EmailDragDropEditor from '../EmailDragDropEditor';

export default function EmailTemplateEditModal({
  isOpen,
  onClose,
  editingTemplate,
  formData,
  setFormData,
  handleSave,
  onOpenFullscreen,
  editorActions
}) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99990] flex items-center justify-center p-2 md:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-6xl max-h-[96vh] overflow-y-auto border border-gray-100 dark:border-white/10 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <FiFileText className="text-blue-500" /> {editingTemplate ? 'Editar Template de E-mail' : 'Novo Template de E-mail'}
            </h3>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-500/10 text-blue-500 text-xs font-medium rounded-full">
              <FiZap size={12} /> Digite / para variáveis
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenFullscreen}
              className="px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-blue-500/20"
              title="Abrir em Tela Cheia no Computador (100% da tela)"
            >
              <FiMaximize2 size={13} /> <span>Tela Cheia</span>
            </button>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <FiX size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Nome do Template *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: E-mail de Boas Vindas"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-white"
              />
            </div>

            <div className="relative">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Assunto do E-mail *
              </label>
              <input
                ref={editorActions.subjectRef}
                type="text"
                required
                placeholder="Ex: {{nome}}, seu convite exclusivo chegou! (Digite / para variáveis)"
                value={formData.subject}
                onChange={e => editorActions.handleInputChange('subject', e)}
                onKeyDown={e => editorActions.handleKeyDown('subject', e)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-white"
              />
            </div>
          </div>

          <div className="relative space-y-2">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Corpo do E-mail (Editor Drag & Drop Visual) *
            </label>
            
            <EmailDragDropEditor
              initialHtml={formData.body_html}
              onChangeHtml={(html) => setFormData(prev => ({ ...prev, body_html: html }))}
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700 shrink-0">
            <div className="text-[11px] text-gray-400 flex items-center gap-1">
              💡 Clique no botão <span className="font-bold text-blue-500">Tela Cheia</span> para abrir em 100% da tela do seu computador.
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20"
              >
                Salvar Template
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
