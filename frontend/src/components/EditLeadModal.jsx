import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiUser, FiPhone, FiMail, FiTag, FiSave, FiLoader } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { API_URL } from '../config';
import { fetchWithAuth } from '../AuthContext';
import { useClient } from '../contexts/ClientContext';
import useScrollLock from '../hooks/useScrollLock';

const EditLeadModal = ({
    isOpen,
    onClose,
    lead,
    onSuccess
}) => {
    const { activeClient } = useClient();
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        tags: ''
    });
    const [isSaving, setIsSaving] = useState(false);

    useScrollLock(isOpen);

    useEffect(() => {
        if (lead && isOpen) {
            setFormData({
                name: lead.name || '',
                phone: lead.phone || '',
                email: lead.email || '',
                tags: lead.tags || ''
            });
        }
    }, [lead, isOpen]);

    if (!isOpen || !lead) return null;

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!activeClient) return;

        setIsSaving(true);
        try {
            const res = await fetchWithAuth(`${API_URL}/leads/${lead.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            }, activeClient.id);

            if (res.ok) {
                toast.success("Informações do contato atualizadas!");
                onSuccess();
                onClose();
            } else {
                const error = await res.json();
                toast.error(error.detail || "Erro ao atualizar contato.");
            }
        } catch (err) {
            console.error(err);
            toast.error("Erro na comunicação com o servidor.");
        } finally {
            setIsSaving(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/85 backdrop-blur-md animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div
                className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden transform transition-all animate-in zoom-in-95 fade-in duration-300 border border-gray-100 dark:border-gray-700"
                onClick={e => e.stopPropagation()}
            >
                {/* Header Decoration */}
                <div className="h-2 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />

                <div className="p-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                                    <FiUser size={20} />
                                </div>
                                Editar Contato
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">
                               ID: <span className="font-mono text-xs">{lead.id}</span> • Atualize os dados deste contato.
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all active:scale-90"
                        >
                            <FiX size={24} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Name Field */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Nome Completo</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                                    <FiUser size={18} />
                                </div>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    placeholder="Ex: João da Silva"
                                    className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white font-medium"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Phone Field */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Telefone (DDI+DDD+NÚMERO)</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                                        <FiPhone size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        placeholder="Ex: 5511999999999"
                                        required
                                        className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white font-mono text-sm font-bold"
                                    />
                                </div>
                            </div>

                            {/* Email Field */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">E-mail</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                                        <FiMail size={18} />
                                    </div>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        placeholder="Ex: joao@email.com"
                                        className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white font-medium"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Tags Field */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Etiquetas (separadas por vírgula)</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-4 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                                    <FiTag size={18} />
                                </div>
                                <textarea
                                    name="tags"
                                    value={formData.tags}
                                    onChange={handleInputChange}
                                    placeholder="Ex: lead, urgente, vip"
                                    rows="2"
                                    className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white font-medium resize-none shadow-inner"
                                />
                            </div>
                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-1 px-1">
                               Dica: Use etiquetas para filtrar este contato em disparos de massa.
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-4 mt-10">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-3 rounded-2xl text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-600 active:scale-95"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 min-w-[160px]"
                            >
                                {isSaving ? (
                                    <>
                                        <FiLoader className="animate-spin text-white" />
                                        Salvando...
                                    </>
                                ) : (
                                    <>
                                        <FiSave />
                                        Salvar Alterações
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default EditLeadModal;
