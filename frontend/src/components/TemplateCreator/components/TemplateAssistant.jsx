import React, { useState, useEffect, useRef } from 'react';
import { FiMessageSquare, FiSend, FiX, FiZap, FiCheck, FiMaximize2, FiMinimize2, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';

export default function TemplateAssistant({ logic }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: 'Olá! Sou o assistente inteligente do ZapVoice. Posso ajudar você a criar e refinar seus templates de mensagens para o WhatsApp.\n\nPara começarmos, me conte: mais ou menos do que se trata o seu template? (Ex: É para boas-vindas de pós-compra, recuperação de boleto, oferta especial, etc.)'
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [expandedCardIndex, setExpandedCardIndex] = useState(null);
    
    // Checklist of fields to apply
    const [fieldsToApply, setFieldsToApply] = useState({
        name: true,
        category: true,
        header: true,
        body: true,
        footer: true,
        buttons: true
    });

    const chatEndRef = useRef(null);

    // Auto scroll to bottom
    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    // Parse JSON out of markdown blocks in the assistant content
    const extractJSON = (text) => {
        try {
            const regex = /```json\s*([\s\S]*?)\s*```/;
            const match = text.match(regex);
            if (match && match[1]) {
                const parsed = JSON.parse(match[1]);
                if (parsed.body_text || parsed.name) {
                    return parsed;
                }
            }
        } catch (e) {
            console.error("Erro ao fazer parse do JSON sugerido:", e);
        }
        return null;
    };

    const handleSend = async (e) => {
        if (e) e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const history = [...messages, userMsg];
            const res = await fetchWithAuth(
                `${API_URL}/whatsapp/assistant/chat`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ messages: history })
                },
                logic.activeClient?.id
            );

            if (res.ok) {
                const data = await res.json();
                setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
            } else {
                const err = await res.json();
                toast.error(err.detail || 'Erro ao conversar com o assistente.');
            }
        } catch (err) {
            console.error(err);
            toast.error('Erro de rede ao conectar com o assistente.');
        } finally {
            setLoading(false);
        }
    };

    const handleApplyTemplate = (tplData) => {
        if (!tplData) return;

        const updatedData = { ...logic.formData };

        if (fieldsToApply.name && tplData.name) updatedData.name = tplData.name;
        if (fieldsToApply.category && tplData.category) updatedData.category = tplData.category;
        
        if (fieldsToApply.header) {
            updatedData.header_type = tplData.header_type || 'NONE';
            updatedData.header_text = tplData.header_text || '';
            updatedData.header_media_url = tplData.header_media_url || '';
        }
        
        if (fieldsToApply.body && tplData.body_text) updatedData.body_text = tplData.body_text;
        if (fieldsToApply.footer && tplData.footer_text) updatedData.footer_text = tplData.footer_text;
        
        if (fieldsToApply.buttons) {
            updatedData.buttons = Array.isArray(tplData.buttons) ? tplData.buttons.map(b => ({
                type: b.type || 'QUICK_REPLY',
                text: b.text || '',
                phone_number: b.phone_number || '',
                url: b.url || ''
            })) : [];
        }

        logic.setFormData(updatedData);
        toast.success('Campos selecionados aplicados ao formulário com sucesso!');
        
        // Scroll to form smoothly
        const formEl = document.getElementById('templateForm');
        if (formEl) {
            formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const toggleField = (field) => {
        setFieldsToApply(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    };

    return (
        <div className="fixed bottom-6 right-6 z-[999] transition-all duration-300">
            {/* Floating Bubble Icon */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 rounded-full flex items-center justify-center text-white shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 group border border-blue-400/30 relative"
                    title="Assistente de Criação com IA"
                >
                    <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-md group-hover:blur-lg transition-all duration-300" />
                    <FiZap className="w-6 h-6 animate-pulse group-hover:rotate-12 transition-transform duration-300" />
                </button>
            )}

            {/* Chat Drawer/Panel */}
            {isOpen && (
                <div 
                    className={`bg-white/80 dark:bg-gray-900/90 backdrop-blur-xl rounded-3xl border border-gray-200/50 dark:border-gray-800/80 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300 transition-all ${
                        isMaximized 
                            ? 'w-[90vw] md:w-[750px] h-[80vh]' 
                            : 'w-[380px] sm:w-[420px] h-[550px]'
                    }`}
                >
                    
                    {/* Header */}
                    <div className="px-6 py-4 bg-gradient-to-r from-blue-600/90 to-indigo-600/90 dark:from-blue-900/40 dark:to-indigo-900/40 border-b border-gray-100 dark:border-gray-800/40 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/10 dark:bg-blue-500/20 rounded-xl flex items-center justify-center text-white dark:text-blue-400">
                                <FiZap className="w-5 h-5 animate-pulse" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white dark:text-gray-100 flex items-center gap-1.5 text-base">
                                    ZapVoice IA
                                </h3>
                                <p className="text-[11px] text-blue-100/80 dark:text-gray-400/85">Assistente de templates do WhatsApp</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Maximize / Minimize Button */}
                            <button
                                onClick={() => setIsMaximized(!isMaximized)}
                                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
                                title={isMaximized ? "Minimizar" : "Maximizar"}
                            >
                                {isMaximized ? <FiMinimize2 size={16} /> : <FiMaximize2 size={16} />}
                            </button>
                            {/* Close Button */}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
                                title="Fechar"
                            >
                                <FiX size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 select-text">
                        {messages.map((msg, index) => {
                            const isUser = msg.role === 'user';
                            const tplData = !isUser ? extractJSON(msg.content) : null;
                            const cleanContent = msg.content.replace(/```json[\s\S]*?```/g, '').trim();
                            const isExpanded = expandedCardIndex === index;

                            return (
                                <div key={index} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                                    <div
                                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm transition-all duration-300 leading-relaxed whitespace-pre-wrap ${
                                            isUser
                                                ? 'bg-blue-600 text-white rounded-tr-none'
                                                : 'bg-gray-100 dark:bg-gray-800/60 dark:border dark:border-gray-700/30 text-gray-800 dark:text-gray-100 rounded-tl-none'
                                        }`}
                                    >
                                        {cleanContent}
                                    </div>
                                    
                                    {/* Advanced Interactive Preview Card for JSON templates */}
                                    {tplData && (
                                        <div className="mt-3 p-4 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100/60 dark:border-blue-900/35 rounded-2xl w-full max-w-[90%] flex flex-col gap-3 transition-all">
                                            <div 
                                                onClick={() => setExpandedCardIndex(isExpanded ? null : index)}
                                                className="flex items-center justify-between cursor-pointer group"
                                            >
                                                <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                                                    <FiZap size={12} className="animate-bounce" /> 
                                                    <span>Template Sugerido Detectado</span>
                                                </div>
                                                <div className="text-blue-500 hover:text-blue-600 flex items-center gap-1 text-xs">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider">{isExpanded ? "Ocultar" : "Revisar/Visualizar"}</span>
                                                    {isExpanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                                                </div>
                                            </div>

                                            {/* Expandable Preview and Selector Area */}
                                            {isExpanded && (
                                                <div className="text-xs bg-white/60 dark:bg-gray-900/70 p-3.5 rounded-xl border border-blue-50/50 dark:border-blue-900/20 space-y-3 max-h-[250px] overflow-y-auto">
                                                    
                                                    {/* Template Name Field */}
                                                    {tplData.name && (
                                                        <div className="flex items-start gap-2.5 pb-2 border-b border-gray-100 dark:border-gray-800/40">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={fieldsToApply.name} 
                                                                onChange={() => toggleField('name')} 
                                                                className="mt-0.5 rounded text-blue-600 border-gray-300 dark:border-gray-700" 
                                                            />
                                                            <div className="flex-1">
                                                                <span className="font-bold text-[10px] uppercase text-gray-400">Nome</span>
                                                                <div className="font-mono text-gray-700 dark:text-gray-200 mt-0.5">{tplData.name}</div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Category */}
                                                    {tplData.category && (
                                                        <div className="flex items-start gap-2.5 pb-2 border-b border-gray-100 dark:border-gray-800/40">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={fieldsToApply.category} 
                                                                onChange={() => toggleField('category')} 
                                                                className="mt-0.5 rounded text-blue-600 border-gray-300 dark:border-gray-700" 
                                                            />
                                                            <div className="flex-1">
                                                                <span className="font-bold text-[10px] uppercase text-gray-400">Categoria</span>
                                                                <div className="text-gray-700 dark:text-gray-200 mt-0.5 font-semibold">{tplData.category}</div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Header Text */}
                                                    {tplData.header_text && (
                                                        <div className="flex items-start gap-2.5 pb-2 border-b border-gray-100 dark:border-gray-800/40">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={fieldsToApply.header} 
                                                                onChange={() => toggleField('header')} 
                                                                className="mt-0.5 rounded text-blue-600 border-gray-300 dark:border-gray-700" 
                                                            />
                                                            <div className="flex-1">
                                                                <span className="font-bold text-[10px] uppercase text-gray-400">Cabeçalho ({tplData.header_type})</span>
                                                                <div className="text-gray-700 dark:text-gray-200 mt-0.5 whitespace-pre-line">{tplData.header_text}</div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Body Message */}
                                                    {tplData.body_text && (
                                                        <div className="flex items-start gap-2.5 pb-2 border-b border-gray-100 dark:border-gray-800/40">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={fieldsToApply.body} 
                                                                onChange={() => toggleField('body')} 
                                                                className="mt-0.5 rounded text-blue-600 border-gray-300 dark:border-gray-700" 
                                                            />
                                                            <div className="flex-1">
                                                                <span className="font-bold text-[10px] uppercase text-gray-400">Corpo da Mensagem</span>
                                                                <div className="text-gray-700 dark:text-gray-200 mt-0.5 whitespace-pre-line leading-relaxed bg-blue-50/20 dark:bg-blue-950/10 p-2 rounded-lg">{tplData.body_text}</div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Footer */}
                                                    {tplData.footer_text && (
                                                        <div className="flex items-start gap-2.5 pb-2 border-b border-gray-100 dark:border-gray-800/40">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={fieldsToApply.footer} 
                                                                onChange={() => toggleField('footer')} 
                                                                className="mt-0.5 rounded text-blue-600 border-gray-300 dark:border-gray-700" 
                                                            />
                                                            <div className="flex-1">
                                                                <span className="font-bold text-[10px] uppercase text-gray-400">Rodapé</span>
                                                                <div className="text-gray-500 dark:text-gray-400 mt-0.5 italic">{tplData.footer_text}</div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Buttons */}
                                                    {Array.isArray(tplData.buttons) && tplData.buttons.length > 0 && (
                                                        <div className="flex items-start gap-2.5">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={fieldsToApply.buttons} 
                                                                onChange={() => toggleField('buttons')} 
                                                                className="mt-0.5 rounded text-blue-600 border-gray-300 dark:border-gray-700" 
                                                            />
                                                            <div className="flex-1">
                                                                <span className="font-bold text-[10px] uppercase text-gray-400">Botões ({tplData.buttons.length})</span>
                                                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                                    {tplData.buttons.map((b, bIdx) => (
                                                                        <div key={bIdx} className="bg-gray-100 dark:bg-gray-800 text-[10px] px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700/60 font-semibold text-gray-650 dark:text-gray-300">
                                                                            {b.text} <span className="text-[8px] opacity-60">({b.type})</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <button
                                                onClick={() => handleApplyTemplate(tplData)}
                                                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                                            >
                                                <FiCheck size={14} /> Aplicar Campos Selecionados
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {loading && (
                            <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-850 px-3 py-1.5 rounded-full w-max">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-100" />
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-200" />
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-300" />
                                Assistente está pensando...
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Footer Input */}
                    <form onSubmit={handleSend} className="p-4 border-t border-gray-150 dark:border-gray-800/40 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md flex items-end gap-2">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Escreva sua mensagem aqui..."
                            disabled={loading}
                            rows={isMaximized ? 3 : 1}
                            className="flex-1 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/60 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all dark:text-white disabled:opacity-50 resize-none py-2"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || loading}
                            className="w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center shadow-md active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex-shrink-0"
                        >
                            <FiSend size={16} />
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
