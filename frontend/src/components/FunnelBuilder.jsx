import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { toast } from 'react-hot-toast';
import { fetchWithAuth } from '../AuthContext';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useClient } from '../contexts/ClientContext';

const SortableStep = ({ step, index, steps, updateStep, removeStep, templates, existingFunnels = [], currentFunnelId, activeClient }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: step.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="border p-4 rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 flex flex-col gap-2 relative group touch-none mb-4">
            {/* Handle para arrastar */}
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                    <div {...attributes} {...listeners} className="cursor-move p-1 text-gray-400 hover:text-gray-600 bg-gray-100 dark:bg-gray-600 dark:text-gray-300 dark:hover:text-white rounded">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                        </svg>
                    </div>
                    <span className="font-semibold text-gray-700 dark:text-white capitalize">
                        Etapa {index + 1}: {step.type === 'poll' ? 'Enquete' : step.type === 'delay' ? 'Delay' : step.type === 'message' ? 'Mensagem' : step.type}
                    </span>
                </div>
                <button onClick={() => removeStep(step.id)} className="text-red-500 hover:text-red-700 text-sm font-semibold">Remover</button>
            </div>

            {step.type === 'message' && (
                <div className="space-y-3">
                    <textarea
                        value={step.content}
                        onChange={(e) => updateStep(step.id, 'content', e.target.value)}
                        className="w-full p-2 border border-gray-300 dark:border-gray-500 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        placeholder="Digite a mensagem..."
                        rows={2}
                    />

                    {/* Opções de Botão Interativo */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-100 dark:border-blue-800">
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={step.interactive || false}
                                onChange={(e) => updateStep(step.id, 'interactive', e.target.checked)}
                                className="form-checkbox h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm font-bold text-blue-800 dark:text-blue-200">🔘 Enviar com Botões (WhatsApp Oficial)</span>
                        </label>

                        {step.interactive && (
                            <div className="mt-2 space-y-2">
                                <p className="text-xs text-blue-600">
                                    Adicione até 3 botões de resposta rápida. O usuário poderá clicar para responder.
                                </p>
                                {[0, 1, 2].map(idx => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <span className="text-xs text-blue-700 font-bold w-4">{idx + 1}.</span>
                                        <input
                                            type="text"
                                            value={step.buttons?.[idx] || ''}
                                            onChange={(e) => {
                                                const newButtons = [...(step.buttons || [])];
                                                newButtons[idx] = e.target.value;
                                                updateStep(step.id, 'buttons', newButtons);
                                            }}
                                            placeholder={`Botão ${idx + 1} (ex: Sim, Quero)`}
                                            className="flex-1 p-1 text-sm border border-blue-200 dark:border-blue-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400"
                                            maxLength={20}
                                        />
                                    </div>
                                ))}

                                {/* Nota Privada para Botões (Obrigatório ou Recomendado pois não aparece no Chatwoot) */}
                                <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                                    <label className="flex items-center space-x-2 cursor-pointer mb-2">
                                        <input
                                            type="checkbox"
                                            checked={step.privateMessageEnabled || false}
                                            onChange={(e) => updateStep(step.id, 'privateMessageEnabled', e.target.checked)}
                                            className="form-checkbox h-4 w-4 text-yellow-600 rounded focus:ring-yellow-500"
                                        />
                                        <span className="text-sm font-bold text-yellow-800 dark:text-yellow-200">📝 Criar Nota Interna no Chatwoot?</span>
                                    </label>
                                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-2">
                                        Recomendado! Mensagens de botão via API Oficial não aparecem na timeline do Chatwoot.
                                    </p>

                                    {step.privateMessageEnabled && (
                                        <textarea
                                            value={step.privateMessageContent || ''}
                                            onChange={(e) => updateStep(step.id, 'privateMessageContent', e.target.value)}
                                            placeholder="Ex: Enviei oferta com botões."
                                            className="w-full p-2 text-sm border border-yellow-300 dark:border-yellow-600 rounded focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                            rows={2}
                                        />
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {(['image', 'audio', 'video', 'document'].includes(step.type)) && (
                <div className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-600">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Arquivo de Mídia ({step.type === 'image' ? 'Imagem' : step.type === 'video' ? 'Vídeo' : step.type === 'document' ? 'Documento' : 'Áudio'}):
                    </label>

                    {step.content ? (
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-3 bg-gray-50 p-2 rounded border border-gray-200">
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
                                    <div className="h-16 w-16 flex items-center justify-center bg-gray-200 rounded text-gray-500">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-gray-500 truncate" title={step.content}>{step.content.split('/').pop() || step.content}</p>
                                    <a href={step.content} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">Abrir em nova guia</a>
                                </div>
                                <button
                                    onClick={() => updateStep(step.id, 'content', '')}
                                    className="text-red-500 hover:text-red-700 text-sm font-semibold px-2"
                                    title="Remover arquivo"
                                >
                                    Trocar
                                </button>
                            </div>

                            {/* Renomear arquivo para Documentos */}
                            {step.type === 'document' && (
                                <div className="mt-1">
                                    <label className="text-xs text-gray-500">Nome do arquivo (como aparecerá no WhatsApp):</label>
                                    <input
                                        type="text"
                                        value={step.fileName || ''}
                                        onChange={(e) => updateStep(step.id, 'fileName', e.target.value)}
                                        placeholder="Ex: Proposta.pdf"
                                        className="w-full text-sm p-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                            )}

                        </div>
                    ) : (
                        <div>
                            <input
                                type="file"
                                accept={step.type === 'image' ? ".jpg,.jpeg,.png" : step.type === 'video' ? "video/*" : step.type === 'audio' ? ".ogg,.opus" : ".pdf,.doc,.docx,.txt,.xls,.xlsx"}
                                onChange={async (e) => {
                                    const file = e.target.files[0];
                                    if (!file) return;

                                    // Validação de formato para Imagem (PNG ou JPEG)
                                    if (step.type === 'image') {
                                        const allowedTypes = ['image/jpeg', 'image/png'];
                                        if (!allowedTypes.includes(file.type)) {
                                            toast.error('Formato de imagem inválido.\nEnvie apenas arquivos JPG, JPEG ou PNG.', {
                                                duration: 4000
                                            });
                                            e.target.value = '';
                                            return;
                                        }
                                    }

                                    // Validação de tamanho para Vídeo (Limite 15MB devido à API do WhatsApp)
                                    if (step.type === 'video') {
                                        const fileSizeMB = file.size / (1024 * 1024);
                                        if (fileSizeMB > 15) {
                                            toast.error(`Arquivo muito grande (${fileSizeMB.toFixed(1)}MB).\nO WhatsApp aceita no máximo 16MB para vídeos.\nPor favor, comprima o vídeo antes de enviar.`, {
                                                duration: 6000,
                                                style: { minWidth: '350px' }
                                            });
                                            e.target.value = ''; // Limpa o input
                                            return;
                                        }
                                    }

                                    // Validação para Áudio (Estrito: OGG/OPUS para garantir PTT)
                                    if (step.type === 'audio') {
                                        const fileSizeMB = file.size / (1024 * 1024);
                                        if (fileSizeMB > 16) {
                                            toast.error(`Áudio muito grande (${fileSizeMB.toFixed(1)}MB).\nO limite do WhatsApp é 16MB.`, {
                                                duration: 4000
                                            });
                                            e.target.value = '';
                                            return;
                                        }

                                        // Validação rígida de extensão
                                        const fileExt = file.name.split('.').pop().toLowerCase();
                                        if (!['ogg', 'opus'].includes(fileExt)) {
                                            toast.error('Formato de áudio inválido!\nPara garantir o envio como "gravado na hora" (PTT),\no arquivo DEVE ser .OGG ou .OPUS.', {
                                                duration: 6000,
                                                style: { minWidth: '350px' }
                                            });
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
                                        // Auto-fill filename from the uploaded file
                                        updateStep(step.id, 'fileName', file.name);
                                        updateStep(step.id, 'error', null);
                                    } catch (err) {
                                        console.error("Upload failed", err);
                                        toast.error("Erro ao fazer upload. Verifique o console.");
                                        updateStep(step.id, 'error', "Falha no envio do arquivo. Tente novamente.");
                                    } finally {
                                        updateStep(step.id, 'uploading', false);
                                    }
                                }}
                                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            {step.uploading && <div className="text-blue-500 text-xs mt-1 animate-pulse">Enviando arquivo... (Aguarde aparecer o preview)</div>}
                            {step.error && <div className="text-red-500 text-xs mt-1 font-bold">{step.error}</div>}

                        </div>
                    )}

                    {/* Configuração de Nota Interna (Visível sempre para Áudio) */}
                    {step.type === 'audio' && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                            <label className="flex items-center space-x-2 cursor-pointer mb-2">
                                <input
                                    type="checkbox"
                                    checked={step.privateMessageEnabled || false}
                                    onChange={(e) => updateStep(step.id, 'privateMessageEnabled', e.target.checked)}
                                    className="form-checkbox h-4 w-4 text-yellow-600 rounded focus:ring-yellow-500"
                                />
                                <span className="text-sm font-bold text-yellow-800">📝 Criar Nota Interna no Chatwoot?</span>
                            </label>
                            <p className="text-xs text-yellow-700 mb-2">
                                Útil para registrar que um áudio foi enviado, já que áudios enviados via API Direta (Meta) podem não aparecer na timeline do Chatwoot.
                            </p>

                            {step.privateMessageEnabled && (
                                <textarea
                                    value={step.privateMessageContent || ''}
                                    onChange={(e) => updateStep(step.id, 'privateMessageContent', e.target.value)}
                                    placeholder="Ex: Áudio de boas-vindas enviado."
                                    className="w-full p-2 text-sm border border-yellow-300 rounded focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500"
                                    rows={2}
                                />
                            )}
                        </div>
                    )}
                </div>
            )}

            {step.type === 'delay' && (
                <div className="flex items-center gap-2">
                    <span className="text-gray-700 dark:text-gray-300">Aguardar</span>
                    <input
                        type="number"
                        value={step.delay}
                        onChange={(e) => updateStep(step.id, 'delay', parseInt(e.target.value))}
                        className="w-20 p-2 border border-gray-300 dark:border-gray-500 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        min="1"
                    />
                    <select
                        value={step.timeUnit || 'seconds'}
                        onChange={(e) => updateStep(step.id, 'timeUnit', e.target.value)}
                        className="p-2 border border-gray-300 dark:border-gray-500 rounded bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                    >
                        <option value="seconds">Segundos</option>
                        <option value="minutes">Minutos</option>
                        <option value="hours">Horas</option>
                        <option value="days">Dias</option>
                    </select>
                </div>
            )}

            {step.type === 'condition_date' && (
                <div className="space-y-3 p-2 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-100 dark:border-orange-800/50">
                    <div>
                        <span className="text-sm font-bold text-orange-800 dark:text-orange-300">Se a data atual for:</span>
                        <select
                            value={step.condition || 'before'}
                            onChange={(e) => updateStep(step.id, 'condition', e.target.value)}
                            className="ml-2 p-1 border rounded text-sm w-full mt-1 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                        >
                            <option value="before">Antes de...</option>
                            <option value="after">Depois de...</option>
                            <option value="between">Entre datas...</option>
                        </select>
                    </div>

                    <div className="p-2 bg-green-50 rounded border border-green-100 mb-2">
                        <label className="block text-xs uppercase text-green-800 font-bold mb-1">Se ATENDER a condição (Verdadeiro):</label>
                        <select
                            value={step.onMatch || 'next_step'}
                            onChange={(e) => updateStep(step.id, 'onMatch', e.target.value)}
                            className="w-full p-2 border border-green-300 rounded text-sm bg-white"
                        >
                            <option value="next_step">➡️ Continuar para próxima etapa</option>
                            <option value="trigger_funnel">🚀 Disparar Outro Funil</option>
                        </select>
                        {step.onMatch === 'trigger_funnel' && (
                            <div className="mt-2 text-xs">
                                <p className="text-gray-500 mb-1">Funil a disparar:</p>
                                <select
                                    value={step.triggerFunnelIdMatch || ''}
                                    onChange={(e) => updateStep(step.id, 'triggerFunnelIdMatch', parseInt(e.target.value) || null)}
                                    className="w-full p-2 border border-green-300 rounded bg-white"
                                >
                                    <option value="">Selecione um funil...</option>
                                    {existingFunnels.map(f => (
                                        <option key={f.id} value={f.id} disabled={currentFunnelId && f.id === currentFunnelId}>
                                            {f.name} (ID: {f.id}) {currentFunnelId && f.id === currentFunnelId ? '(Atual)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {(step.condition === 'before' || step.condition === 'after' || !step.condition) && (
                        <div>
                            <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Data de Referência</label>
                            <input
                                type="datetime-local"
                                value={step.targetDate || ''}
                                onChange={(e) => updateStep(step.id, 'targetDate', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded text-sm"
                            />
                        </div>
                    )}

                    {step.condition === 'between' && (
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Data Inicial</label>
                                <input
                                    type="datetime-local"
                                    value={step.startDate || ''}
                                    onChange={(e) => updateStep(step.id, 'startDate', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Data Final</label>
                                <input
                                    type="datetime-local"
                                    value={step.endDate || ''}
                                    onChange={(e) => updateStep(step.id, 'endDate', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded text-sm"
                                />
                            </div>
                        </div>
                    )}

                    {step.condition === 'between' ? (
                        <div className="grid grid-cols-1 gap-3 mt-3">
                            {/* Caso: ANTES DA DATA INICIAL */}
                            <div className="p-3 bg-blue-50 rounded border border-blue-100">
                                <label className="block text-xs uppercase text-blue-800 font-bold mb-1">Se for ANTES do início:</label>
                                <select
                                    value={step.onMismatchBefore || 'stop'}
                                    onChange={(e) => updateStep(step.id, 'onMismatchBefore', e.target.value)}
                                    className="w-full p-2 border border-blue-300 rounded text-sm bg-white"
                                >
                                    <option value="stop">❌ Parar Funil</option>
                                    <option value="wait">⏳ Aguardar chegar a data</option>
                                    <option value="jump">↪️ Pular para outra etapa</option>
                                    <option value="trigger_funnel">🚀 Disparar Outro Funil</option>
                                </select>
                                {step.onMismatchBefore === 'jump' && (
                                    <div className="mt-2">
                                        <select
                                            value={step.jumpToStepIdxBefore ?? ''}
                                            onChange={(e) => updateStep(step.id, 'jumpToStepIdxBefore', parseInt(e.target.value))}
                                            className="w-full p-1 border border-blue-300 rounded text-xs bg-white"
                                        >
                                            <option value="" disabled>Ir para etapa...</option>
                                            {steps.map((s, idx) => (
                                                <option key={s.id} value={idx}>{idx + 1}. {s.type}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                {step.onMismatchBefore === 'trigger_funnel' && (
                                    <div className="mt-2 text-xs">
                                        <p className="text-gray-500 mb-1">Funil a disparar:</p>
                                        <select
                                            value={step.triggerFunnelIdBefore || ''}
                                            onChange={(e) => updateStep(step.id, 'triggerFunnelIdBefore', parseInt(e.target.value) || null)}
                                            className="w-full p-1 border border-blue-300 rounded text-xs bg-white"
                                        >
                                            <option value="">Selecione um funil...</option>
                                            {existingFunnels.map(f => (
                                                <option key={f.id} value={f.id} disabled={currentFunnelId && f.id === currentFunnelId}>
                                                    {f.name} (ID: {f.id})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* Caso: DEPOIS DA DATA FINAL */}
                            <div className="p-3 bg-red-50 rounded border border-red-100">
                                <label className="block text-xs uppercase text-red-800 font-bold mb-1">Se for DEPOIS do fim:</label>
                                <select
                                    value={step.onMismatchAfter || 'stop'}
                                    onChange={(e) => updateStep(step.id, 'onMismatchAfter', e.target.value)}
                                    className="w-full p-2 border border-red-300 rounded text-sm bg-white"
                                >
                                    <option value="stop">❌ Parar Funil</option>
                                    <option value="jump">↪️ Pular para outra etapa</option>
                                    <option value="trigger_funnel">🚀 Disparar Outro Funil</option>
                                </select>
                                {step.onMismatchAfter === 'jump' && (
                                    <div className="mt-2">
                                        <select
                                            value={step.jumpToStepIdxAfter ?? ''}
                                            onChange={(e) => updateStep(step.id, 'jumpToStepIdxAfter', parseInt(e.target.value))}
                                            className="w-full p-1 border border-red-300 rounded text-xs bg-white"
                                        >
                                            <option value="" disabled>Ir para etapa...</option>
                                            {steps.map((s, idx) => (
                                                <option key={s.id} value={idx}>{idx + 1}. {s.type}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                {step.onMismatchAfter === 'trigger_funnel' && (
                                    <div className="mt-2 text-xs">
                                        <p className="text-gray-500 mb-1">Funil a disparar:</p>
                                        <select
                                            value={step.triggerFunnelIdAfter || ''}
                                            onChange={(e) => updateStep(step.id, 'triggerFunnelIdAfter', parseInt(e.target.value) || null)}
                                            className="w-full p-1 border border-red-300 rounded text-xs bg-white"
                                        >
                                            <option value="">Selecione um funil...</option>
                                            {existingFunnels.map(f => (
                                                <option key={f.id} value={f.id} disabled={currentFunnelId && f.id === currentFunnelId}>
                                                    {f.name} (ID: {f.id})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="mt-2">
                            <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Se não atender?</label>
                            <select
                                value={step.onMismatch || 'stop'}
                                onChange={(e) => updateStep(step.id, 'onMismatch', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded text-sm bg-white"
                            >
                                <option value="stop">❌ Parar Funil</option>
                                <option value="wait">⏳ Aguardar até atender (Sleep)</option>
                                <option value="jump">↪️ Pular para outra etapa</option>
                                <option value="trigger_funnel">🚀 Disparar Outro Funil</option>
                            </select>

                            {step.onMismatch === 'wait' && step.condition === 'before' && (
                                <p className="text-red-500 text-xs mt-1">⚠️ Cuidado: "Aguardar" é impossível se a data máxima já passou.</p>
                            )}

                            {step.onMismatch === 'jump' && (
                                <div className="mt-2">
                                    <label className="block text-xs text-gray-600 mb-1">Ir para qual etapa?</label>
                                    <select
                                        value={step.jumpToStepIdx ?? ''}
                                        onChange={(e) => updateStep(step.id, 'jumpToStepIdx', parseInt(e.target.value))}
                                        className="w-full p-2 border border-blue-300 rounded text-sm bg-blue-50"
                                    >
                                        <option value="" disabled>Selecione a etapa...</option>
                                        {steps.map((s, idx) => (
                                            <option key={s.id} value={idx}>
                                                {idx + 1}. {s.type.toUpperCase()} {idx === index ? '(Atual)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {step.onMismatch === 'trigger_funnel' && (
                                <div className="mt-2 text-xs">
                                    <p className="text-gray-500 mb-1">Funil a disparar:</p>
                                    <select
                                        value={step.triggerFunnelId || ''}
                                        onChange={(e) => updateStep(step.id, 'triggerFunnelId', parseInt(e.target.value) || null)}
                                        className="w-full p-2 border border-gray-300 rounded text-sm bg-white"
                                    >
                                        <option value="">Selecione um funil...</option>
                                        {existingFunnels.map(f => (
                                            <option key={f.id} value={f.id} disabled={currentFunnelId && f.id === currentFunnelId}>
                                                {f.name} (ID: {f.id}) {currentFunnelId && f.id === currentFunnelId ? '(Atual)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="text-xs text-orange-600 italic mt-2">
                        * Referência: Horário de Brasília (UTC-3).
                    </div>
                </div>
            )}

            {step.type === 'poll' && (
                <div className="space-y-2">
                    <input
                        type="text"
                        value={step.content}
                        onChange={(e) => updateStep(step.id, 'content', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded mb-2"
                        placeholder="Pergunta da enquete..."
                    />
                    <div className="pl-4 border-l-2 border-gray-200 space-y-2">
                        <label className="text-sm font-semibold text-gray-500">Opções:</label>
                        {(step.options || []).map((opt, i) => (
                            <div key={i} className="flex gap-2">
                                <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) => {
                                        const newOptions = [...(step.options || [])];
                                        newOptions[i] = e.target.value;
                                        updateStep(step.id, 'options', newOptions);
                                    }}
                                    className="w-full p-1 border border-gray-200 rounded text-sm"
                                    placeholder={`Opção ${i + 1}`}
                                />
                                <button
                                    onClick={() => {
                                        const newOptions = step.options.filter((_, idx) => idx !== i);
                                        updateStep(step.id, 'options', newOptions);
                                    }}
                                    className="text-red-400 hover:text-red-600"
                                >x</button>
                            </div>
                        ))}
                        <button
                            onClick={() => updateStep(step.id, 'options', [...(step.options || []), ''])}
                            className="text-sm text-blue-600 hover:underline"
                        >
                            + Adicionar Opção
                        </button>
                    </div>
                </div>
            )}

            {/* Template Input */}
            {step.type === 'template' && (
                <div className="mt-2 text-sm">
                    <label className="block text-gray-700 font-semibold mb-1">Nome do Template (Meta/Facebook):</label>
                    <div className="flex flex-col gap-2">
                        <select
                            value={step.content || ''}
                            onChange={(e) => updateStep(step.id, 'content', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 outline-none bg-white"
                        >
                            <option value="">Selecione um template...</option>
                            {templates && templates.length > 0 ? (
                                templates.map((t) => (
                                    <option key={t.id || t.name} value={t.name}>
                                        {t.name} ({t.language})
                                    </option>
                                ))
                            ) : (
                                <option value="" disabled>Carregando templates...</option>
                            )}
                        </select>
                        <input
                            type="text"
                            value={step.content || ''}
                            onChange={(e) => updateStep(step.id, 'content', e.target.value)}
                            placeholder="Ou digite manualmente..."
                            className="w-full p-2 border border-gray-200 rounded text-xs text-gray-600"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

const FunnelBuilder = ({ onSave, onCancel, initialData, existingFunnels = [] }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [triggerPhrase, setTriggerPhrase] = useState('');
    const [allowedPhone, setAllowedPhone] = useState('');
    const [steps, setSteps] = useState([]);
    const [templates, setTemplates] = useState([]);
    const { activeClient } = useClient();

    React.useEffect(() => {
        if (!activeClient) return;
        fetchWithAuth(`${API_URL}/whatsapp/templates`, {}, activeClient.id) // Pass activeClient.id
            .then(res => {
                if (res.ok) return res.json();
                throw new Error('Falha ao carregar templates');
            })
            .then(data => {
                if (Array.isArray(data)) setTemplates(data);
                else setTemplates([]);
            })
            .catch(err => {
                console.error("Error loading templates:", err);
                setTemplates([]);
            });
    }, [activeClient]);

    // Estado para controlar qual funil está sendo editado e evitar resets desnecessários
    const [currentFunnelId, setCurrentFunnelId] = useState(null);

    React.useEffect(() => {
        // Se estamos abrindo um novo funil (ou mudando de null para objeto, ou trocando de ID)
        const newId = initialData ? initialData.id : 'new';

        if (newId !== currentFunnelId) {
            setCurrentFunnelId(newId);
            if (initialData) {
                setName(initialData.name);
                setDescription(initialData.description || '');
                setTriggerPhrase(initialData.trigger_phrase || '');
                setAllowedPhone(initialData.allowed_phone || '');
                // Preserva IDs existentes ou gera novos apenas se necessário
                setSteps(initialData.steps.map(s => ({
                    ...s,
                    id: s.id || Date.now() + Math.random(),
                    // Garante que upload não fique travado
                    uploading: false
                })));
            } else {
                setName('');
                setDescription('');
                setTriggerPhrase('');
                setAllowedPhone('');
                setSteps([]);
            }
        } else {
            // Se o ID é o mesmo, NÃO resetamos o estado. 
            // Isso protege contra re-renders do pai alterando initialData por referência.
        }
    }, [initialData, currentFunnelId]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            setSteps((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const addStep = (type) => {
        setSteps([...steps, { type, content: '', delay: 0, id: Date.now() }]);
    };

    const updateStep = (id, field, value) => {
        setSteps(prevSteps => prevSteps.map(step => step.id === id ? { ...step, [field]: value } : step));
    };

    const removeStep = (id) => {
        setSteps(steps.filter(step => step.id !== id));
    };

    const handleSave = () => {
        // Validation
        const isUploading = steps.some(s => s.uploading);
        if (isUploading) {
            toast.error("Aguarde o upload dos arquivos terminar.");
            return;
        }

        for (let i = 0; i < steps.length; i++) {
            const s = steps[i];
            if (['image', 'audio', 'video', 'document', 'poll'].includes(s.type)) {
                if (!s.content || (typeof s.content === 'string' && s.content.trim() === '')) {
                    toast.error(`A etapa ${i + 1} (${s.type === 'poll' ? 'Enquete' : s.type}) precisa de conteúdo/arquivo.`);
                    return;
                }
            }
            if (s.type === 'message' && (!s.content || s.content.trim() === '')) {
                toast.error(`A etapa ${i + 1} (Mensagem) está vazia.`);
                return;
            }
        }

        onSave({ name, description, steps, trigger_phrase: triggerPhrase, allowed_phone: allowedPhone });
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{initialData ? 'Editar Funil' : 'Criar Novo Funil'}</h2>
                <div className="flex gap-2">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700 rounded transition"
                    >
                        Cancelar
                    </button>
                </div>
            </div>

            <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2">Nome do Funil</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                    placeholder="Ex: Funil de Boas-vindas"
                />
            </div>

            <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2">Descrição (Opcional)</label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                    placeholder="Descreva o que este funil faz..."
                    rows={2}
                />
            </div>

            <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-md">
                <label className="block text-gray-800 dark:text-yellow-200 font-bold mb-1">⚡ Palavra-chave do Gatilho (Botão)</label>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Se este funil deve ser iniciado automaticamente quando o cliente clicar em um botão, digite o texto do botão abaixo. <b>Separe por vírgulas para múltiplos gatilhos.</b></p>
                <input
                    type="text"
                    value={triggerPhrase}
                    onChange={(e) => setTriggerPhrase(e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400"
                    placeholder="Ex: Baixar Mapa Astral, Quero Mapa, Sim"
                />
            </div>

            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-md">
                <label className="block text-gray-800 dark:text-red-200 font-bold mb-1">🔒 Restrição de Contato (Opcional)</label>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Se preenchido, este funil SÓ será disparado se o contato tiver este número exato (útil para testes ou VIPs).</p>
                <input
                    type="text"
                    value={allowedPhone}
                    onChange={(e) => setAllowedPhone(e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400"
                    placeholder="Ex: 5511999999999, 11988887777"
                />
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={steps.map(s => s.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-4 mb-4">
                        {steps.map((step, index) => (
                            <SortableStep
                                key={step.id}
                                step={step}
                                index={index}
                                steps={steps}
                                updateStep={updateStep}
                                removeStep={removeStep}
                                templates={templates}
                                existingFunnels={existingFunnels}
                                currentFunnelId={currentFunnelId}
                                activeClient={activeClient}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            <div className="flex flex-wrap gap-2 mb-6">
                <button
                    onClick={() => addStep('message')}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 font-medium text-sm transition-colors"
                >
                    + Mensagem
                </button>
                <button
                    onClick={() => addStep('image')}
                    className="px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 font-medium text-sm transition-colors"
                >
                    + Imagem
                </button>
                <button
                    onClick={() => addStep('video')}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 font-medium text-sm transition-colors"
                >
                    + Vídeo
                </button>
                {/* 
                <button
                    onClick={() => addStep('audio')}
                    className="px-3 py-1 bg-teal-100 text-teal-700 rounded hover:bg-teal-200 font-medium text-sm transition-colors"
                >
                    + Áudio
                </button>
                 */}
                <button
                    onClick={() => addStep('document')}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 font-medium text-sm transition-colors"
                >
                    + Documento
                </button>
                {/* 
                <button
                    onClick={() => addStep('poll')}
                    className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 font-medium text-sm transition-colors"
                >
                    + Enquete
                </button> 
                */}
                <button
                    onClick={() => addStep('delay')}
                    className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 font-medium text-sm transition-colors"
                >
                    + Delay
                </button>
                <button
                    onClick={() => addStep('condition_date')}
                    className="px-3 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 font-medium text-sm transition-colors"
                >
                    + 📅 Condição Data
                </button>
            </div>

            <button
                onClick={handleSave}
                className={`w-full px-4 py-2 font-bold rounded transition ${initialData ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'} disabled:opacity-50 disabled:cursor-not-allowed`}
                disabled={!name || steps.length === 0 || steps.some(s => s.uploading)}
            >
                {steps.some(s => s.uploading) ? 'Enviando arquivos...' : (initialData ? 'Atualizar Funil' : 'Salvar Funil')}
            </button>
        </div>
    );
};

export default FunnelBuilder;
