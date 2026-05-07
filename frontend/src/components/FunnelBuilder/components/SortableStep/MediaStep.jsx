import React from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../../config';
import { fetchWithAuth } from '../../../../AuthContext';

const MediaStep = ({ step, updateStep, activeClient }) => {
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validação de formato para Imagem
        if (step.type === 'image') {
            const allowedTypes = ['image/jpeg', 'image/png'];
            if (!allowedTypes.includes(file.type)) {
                toast.error('Formato de imagem inválido.\nEnvie apenas arquivos JPG, JPEG ou PNG.');
                e.target.value = '';
                return;
            }
        }

        // Validação de tamanho para Vídeo
        if (step.type === 'video') {
            const fileSizeMB = file.size / (1024 * 1024);
            if (fileSizeMB > 15) {
                toast.error(`Arquivo muito grande (${fileSizeMB.toFixed(1)}MB).\nO WhatsApp aceita no máximo 16MB para vídeos.`);
                e.target.value = '';
                return;
            }
        }

        // Validação para Áudio
        if (step.type === 'audio') {
            const fileSizeMB = file.size / (1024 * 1024);
            if (fileSizeMB > 16) {
                toast.error(`Áudio muito grande (${fileSizeMB.toFixed(1)}MB).`);
                e.target.value = '';
                return;
            }
            const fileExt = file.name.split('.').pop().toLowerCase();
            if (!['ogg', 'opus'].includes(fileExt)) {
                toast.error('Formato de áudio inválido!\nO arquivo DEVE ser .OGG ou .OPUS.');
                e.target.value = '';
                return;
            }
        }

        updateStep(step.id, 'uploading', true);
        updateStep(step.id, 'error', null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetchWithAuth(`${API_URL}/upload`, {
                method: 'POST',
                body: formData
            }, activeClient?.id);
            if (!res.ok) throw new Error('Upload failed');
            const data = await res.json();
            updateStep(step.id, 'content', data.url);
            updateStep(step.id, 'fileName', file.name);
        } catch (err) {
            console.error("Upload failed", err);
            toast.error("Erro ao fazer upload.");
            updateStep(step.id, 'error', "Falha no envio do arquivo.");
        } finally {
            updateStep(step.id, 'uploading', false);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-600">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Arquivo de Mídia ({step.type === 'image' ? 'Imagem' : step.type === 'video' ? 'Vídeo' : step.type === 'document' ? 'Documento' : 'Áudio'}):
            </label>

            {step.content ? (
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900/50 p-2 rounded border border-gray-200 dark:border-gray-700">
                        {step.type === 'image' && (
                            <img src={step.content} alt="Preview" className="h-16 w-16 object-cover rounded border" />
                        )}
                        {step.type === 'video' && (
                            <video src={step.content} className="h-24 w-40 object-cover rounded border bg-black" controls />
                        )}
                        {step.type === 'audio' && (
                            <audio src={step.content} className="h-10 w-60" controls />
                        )}
                        {step.type === 'document' && (
                            <div className="h-16 w-16 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded text-gray-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={step.content}>{step.content.split('/').pop() || step.content}</p>
                            <a href={step.content} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">Abrir em nova guia</a>
                        </div>
                        <button
                            onClick={() => updateStep(step.id, 'content', '')}
                            className="text-red-500 hover:text-red-700 text-sm font-semibold px-2"
                        >
                            Trocar
                        </button>
                    </div>

                    {step.type === 'document' && (
                        <div className="mt-1">
                            <label className="text-xs text-gray-500">Nome do arquivo:</label>
                            <input
                                type="text"
                                value={step.fileName || ''}
                                onChange={(e) => updateStep(step.id, 'fileName', e.target.value)}
                                placeholder="Ex: Proposta.pdf"
                                className="w-full text-sm p-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                    )}
                </div>
            ) : (
                <div>
                    <input
                        type="file"
                        onChange={handleFileChange}
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {step.uploading && <div className="text-blue-500 text-xs mt-1 animate-pulse">Enviando arquivo...</div>}
                    {step.error && <div className="text-red-500 text-xs mt-1 font-bold">{step.error}</div>}
                </div>
            )}

            {step.type === 'audio' && (
                <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50 rounded">
                    <label className="flex items-center space-x-2 cursor-pointer mb-2">
                        <input
                            type="checkbox"
                            checked={step.privateMessageEnabled || false}
                            onChange={(e) => updateStep(step.id, 'privateMessageEnabled', e.target.checked)}
                            className="form-checkbox h-4 w-4 text-yellow-600 rounded focus:ring-yellow-500"
                        />
                        <span className="text-sm font-bold text-yellow-800 dark:text-yellow-200">📝 Criar Nota Interna?</span>
                    </label>
                    {step.privateMessageEnabled && (
                        <textarea
                            value={step.privateMessageContent || ''}
                            onChange={(e) => updateStep(step.id, 'privateMessageContent', e.target.value)}
                            placeholder="Ex: Áudio enviado."
                            className="w-full p-2 text-sm border border-yellow-300 dark:border-yellow-600 rounded bg-white dark:bg-gray-800 dark:text-white"
                            rows={2}
                        />
                    )}
                </div>
            )}
        </div>
    );
};

export default MediaStep;
