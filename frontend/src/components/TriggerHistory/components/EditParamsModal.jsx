import React from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';

const EditParamsModal = ({ editParamsModal, setEditParamsModal, activeClient, fetchHistory }) => {
    const saveParams = async () => {
        try {
            const res = await fetchWithAuth(`${API_URL}/triggers/${editParamsModal.id}/update-params`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    delay_seconds: Number(editParamsModal.delay),
                    concurrency_limit: Number(editParamsModal.concurrency),
                    contacts_list: editParamsModal.contacts,
                    scheduled_time: editParamsModal.scheduledTime ? new Date(editParamsModal.scheduledTime).toISOString() : null
                })
            }, activeClient?.id);

            if (res.ok) {
                toast.success("Parâmetros atualizados!");
                setEditParamsModal({ ...editParamsModal, isOpen: false });
                fetchHistory();
            } else {
                const data = await res.json();
                toast.error(data.detail || "Erro ao atualizar");
            }
        } catch (error) {
            console.error(error);
            toast.error("Erro de conexão");
        }
    };

    if (!editParamsModal.isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm animated-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full p-6">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Editar Parâmetros de Envio</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Data/Hora Agendada</label>
                        <input
                            type="datetime-local"
                            value={editParamsModal.scheduledTime}
                            onChange={(e) => setEditParamsModal({ ...editParamsModal, scheduledTime: e.target.value })}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Delay (segundos)</label>
                        <input
                            type="number"
                            min="1"
                            value={editParamsModal.delay}
                            onChange={(e) => setEditParamsModal({ ...editParamsModal, delay: e.target.value })}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Concorrência</label>
                        <input
                            type="number"
                            min="1"
                            max="50"
                            value={editParamsModal.concurrency}
                            onChange={(e) => setEditParamsModal({ ...editParamsModal, concurrency: e.target.value })}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                    </div>
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Adicionar Mais Contatos (CSV):
                        </label>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                            Atual: <b>{editParamsModal.contacts?.length || 0}</b> contatos.
                        </div>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={(e) => {
                                const file = e.target.files[0];
                                if (!file) return;

                                const reader = new FileReader();
                                reader.onload = (event) => {
                                    const text = event.target.result;
                                    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
                                    if (lines.length > 0 && !lines[0].toLowerCase().includes('numero')) {
                                        toast.error('O CSV deve ter a coluna "Numero"');
                                        return;
                                    }
                                    const newContacts = lines.slice(1).map(line => {
                                        const rawNum = line.split(',')[0].trim();
                                        return rawNum.replace(/\D/g, '');
                                    }).filter(num => num && num.length >= 8);

                                    const existing = new Set(editParamsModal.contacts || []);
                                    let addedCount = 0;
                                    newContacts.forEach(c => {
                                        if (!existing.has(c)) {
                                            existing.add(c);
                                            addedCount++;
                                        }
                                    });
                                    setEditParamsModal(prev => ({ ...prev, contacts: [...existing] }));
                                    if (addedCount > 0) toast.success(`${addedCount} novos contatos!`);
                                    else toast('Nenhum contato novo.', { icon: 'ℹ️' });
                                };
                                reader.readAsText(file);
                            }}
                            className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={() => setEditParamsModal({ ...editParamsModal, isOpen: false })} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium">Cancelar</button>
                    <button onClick={saveParams} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">Salvar Alterações</button>
                </div>
            </div>
        </div>
    );
};

export default EditParamsModal;
