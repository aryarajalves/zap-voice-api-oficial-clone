import React from 'react';
import { FiSlash, FiFileText, FiImage, FiVideo, FiUpload, FiCheckCircle, FiX } from 'react-icons/fi';

const HeaderSection = ({ logic }) => {
    const { formData, setFormData, fileInputRef, handleMediaUpload, mediaUploading, mediaCache, setMediaCache } = logic;
    const currentMedia = mediaCache[formData.header_type] || { url: '', fileName: '', previewUrl: null };

    return (
        <div className="bg-gray-50/50 dark:bg-gray-900/20 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-4">Cabeçalho (Opcional)</label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                {[
                    { id: 'NONE', label: 'Nenhum', icon: FiSlash },
                    { id: 'TEXT', label: 'Texto', icon: FiFileText },
                    { id: 'IMAGE', label: 'Imagem', icon: FiImage },
                    { id: 'VIDEO', label: 'Vídeo', icon: FiVideo },
                    { id: 'DOCUMENT', label: 'Documento', icon: FiFileText },
                ].map((m) => (
                    <button
                        key={m.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, header_type: m.id, header_media_url: mediaCache[m.id]?.url || '' })}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${formData.header_type === m.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                            : 'border-transparent bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                    >
                        <m.icon size={20} className="mb-1" />
                        <span className="text-[10px] font-bold uppercase">{m.label}</span>
                    </button>
                ))}
            </div>

            {formData.header_type === 'TEXT' && (
                <input
                    type="text"
                    value={formData.header_text}
                    onChange={(e) => setFormData({ ...formData, header_text: e.target.value })}
                    className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white mt-4"
                    placeholder="Texto do cabeçalho..."
                    maxLength={60}
                />
            )}

            {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(formData.header_type) && (
                <div className="mt-4">
                    <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1.5 tracking-wider">Arquivo de Exemplo</label>
                    <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept={
                            formData.header_type === 'IMAGE' ? 'image/jpeg,image/png,image/webp' :
                            formData.header_type === 'VIDEO' ? 'video/mp4,video/3gpp' :
                            '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx'
                        }
                        onChange={(e) => handleMediaUpload(e.target.files?.[0])}
                    />
                    <div
                        onClick={() => !mediaUploading && fileInputRef.current?.click()}
                        className={`w-full flex items-center gap-3 p-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                            formData.header_media_url
                                ? 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/20'
                                : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 hover:border-blue-400 dark:hover:border-blue-500'
                        } ${mediaUploading ? 'opacity-60 cursor-wait' : ''}`}
                    >
                        {mediaUploading ? (
                            <>
                                <svg className="animate-spin w-5 h-5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                </svg>
                                <span className="text-sm text-blue-500">Enviando para a Meta...</span>
                            </>
                        ) : formData.header_media_url ? (
                            <>
                                {currentMedia.previewUrl && formData.header_type === 'IMAGE' ? (
                                    <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-green-200 dark:border-green-800">
                                        <img src={currentMedia.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <FiCheckCircle className="text-green-500 shrink-0" size={18} />
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-green-600 dark:text-green-400 font-medium truncate">{currentMedia.fileName || 'Arquivo enviado'}</p>
                                    <p className="text-[10px] text-gray-400 truncate">{formData.header_media_url}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        setFormData(prev => ({ ...prev, header_media_url: '' }));
                                        setMediaCache(prev => ({ ...prev, [formData.header_type]: { url: '', fileName: '', previewUrl: null } }));
                                    }}
                                    className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                                >
                                    <FiX size={16} />
                                </button>
                            </>
                        ) : (
                            <>
                                <FiUpload className="text-gray-400 shrink-0" size={18} />
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-300">
                                        Clique para selecionar {formData.header_type === 'IMAGE' ? 'uma imagem' : formData.header_type === 'VIDEO' ? 'um vídeo' : 'um documento'}
                                    </p>
                                    <p className="text-[10px] text-gray-400">
                                        {formData.header_type === 'IMAGE' ? 'JPEG, PNG, WEBP' : formData.header_type === 'VIDEO' ? 'MP4, 3GPP' : 'PDF, DOC, XLS, PPT'}
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1 italic">
                        * O arquivo será enviado para a Meta para aprovação do template.
                    </p>
                </div>
            )}
        </div>
    );
};

export default HeaderSection;
