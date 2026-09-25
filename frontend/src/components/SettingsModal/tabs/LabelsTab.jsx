import React, { useState, useEffect } from 'react';
import { FiTag, FiSearch } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../config';
import { LabelForm, LabelCard, LabelsPagination, DeleteLabelModal, TransferLabelModal } from './labels';

const ITEMS_PER_PAGE = 20;

const LabelsTab = ({ user, activeClient }) => {
    const [labels, setLabels] = useState([]);
    const [name, setName] = useState('');
    const [color, setColor] = useState('#3B82F6');
    const [loading, setLoading] = useState(false);
    const [loadingList, setLoadingList] = useState(true);
    const [editingLabel, setEditingLabel] = useState(null);

    // Filtro de Pesquisa e Paginação
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    // Controle do Modal de Deleção
    const [labelToDelete, setLabelToDelete] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    // Controle do Modal de Transferência de Contatos
    const [labelToTransfer, setLabelToTransfer] = useState(null);
    const [isTransferring, setIsTransferring] = useState(false);

    const getHeaders = () => {
        const token = localStorage.getItem('token');
        const clientId = activeClient?.id || user?.client_id || '';
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Client-ID': String(clientId)
        };
    };

    const fetchLabels = async () => {
        setLoadingList(true);
        try {
            const response = await fetch(`${API_URL}/chat/labels/details`, {
                headers: getHeaders()
            });
            if (response.ok) {
                const data = await response.json();
                setLabels(data);
            } else {
                toast.error("Erro ao buscar marcadores.");
            }
        } catch (error) {
            console.error(error);
            toast.error("Falha na comunicação com o servidor.");
        } finally {
            setLoadingList(false);
        }
    };

    useEffect(() => {
        if (activeClient?.id || user?.client_id) {
            fetchLabels();
        } else {
            setLoadingList(false);
        }
    }, [activeClient?.id, user?.client_id]);

    // Filtro por nome em tempo real
    const filteredLabels = labels.filter((lbl) => {
        if (!searchTerm.trim()) return true;
        return lbl.name.toLowerCase().includes(searchTerm.toLowerCase().trim());
    });

    // Ajusta a página atual se a lista diminuir de tamanho
    const totalPages = Math.ceil(filteredLabels.length / ITEMS_PER_PAGE) || 1;
    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [totalPages, currentPage]);

    // Sempre volta para a página 1 ao digitar na busca
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const handleSaveLabel = async (e) => {
        if (e && typeof e.preventDefault === 'function') {
            e.preventDefault();
        }
        const cleanName = name.trim();
        if (!cleanName) {
            toast.error("Por favor, digite o nome da etiqueta.");
            return;
        }
        if (cleanName.length > 25) {
            toast.error("O nome da etiqueta deve ter no máximo 25 caracteres.");
            return;
        }

        const isEditing = editingLabel !== null;
        
        // Validação de unicidade case-insensitive preventiva
        const duplicate = labels.find(l => 
            l.name?.trim().toLowerCase() === cleanName.toLowerCase() &&
            (!isEditing || l.id !== editingLabel.id)
        );
        if (duplicate) {
            toast.error("Já existe uma etiqueta com este nome.");
            return;
        }

        setLoading(true);
        try {
            const method = isEditing ? 'PUT' : 'POST';
            const url = isEditing 
                ? `${API_URL}/chat/labels/${editingLabel.id}`
                : `${API_URL}/chat/labels`;

            const response = await fetch(url, {
                method: method,
                headers: getHeaders(),
                body: JSON.stringify({
                    name: name.trim(),
                    color: color
                })
            });

            if (response.ok) {
                toast.success(isEditing ? "Etiqueta atualizada com sucesso!" : "Etiqueta criada com sucesso!");
                setName('');
                setColor('#3B82F6');
                setEditingLabel(null);
                fetchLabels();
            } else {
                const err = await response.json();
                toast.error(err.detail || `Falha ao ${isEditing ? 'atualizar' : 'criar'} etiqueta.`);
            }
        } catch (error) {
            console.error(error);
            toast.error("Erro ao conectar com o servidor.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteLabel = async () => {
        if (!labelToDelete) return;
        setDeletingId(labelToDelete.id || labelToDelete.name);
        try {
            const url = labelToDelete.id > 0
                ? `${API_URL}/chat/labels/${labelToDelete.id}`
                : `${API_URL}/chat/labels/0?name=${encodeURIComponent(labelToDelete.name)}`;

            const response = await fetch(url, {
                method: 'DELETE',
                headers: getHeaders()
            });

            if (response.ok) {
                toast.success("Etiqueta excluída com sucesso!");
                setLabelToDelete(null);
                fetchLabels();
            } else {
                const err = await response.json();
                toast.error(err.detail || "Falha ao excluir etiqueta.");
            }
        } catch (error) {
            console.error(error);
            toast.error("Erro ao conectar com o servidor.");
        } finally {
            setDeletingId(null);
        }
    };

    const handleTransferLabel = async (targetLabel, action) => {
        if (!labelToTransfer) return;
        setIsTransferring(true);
        try {
            const response = await fetch(`${API_URL}/chat/labels/transfer`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    source_label: labelToTransfer.name,
                    target_label: targetLabel,
                    action: action
                })
            });

            if (response.ok) {
                const data = await response.json();
                toast.success(data.message || "Contatos transferidos com sucesso!");
                setLabelToTransfer(null);
                fetchLabels();
            } else {
                const err = await response.json();
                toast.error(err.detail || "Falha ao transferir contatos.");
            }
        } catch (error) {
            console.error(error);
            toast.error("Erro ao conectar com o servidor.");
        } finally {
            setIsTransferring(false);
        }
    };

    const handleStartEdit = (label) => {
        setEditingLabel(label);
        setName(label.name);
        setColor(label.color);
    };

    // Marcadores paginados da página ativa (máximo 20)
    const paginatedLabels = filteredLabels.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <FiTag className="text-blue-500" />
                    Gerenciar Marcadores / Etiquetas
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Crie e customize marcadores para classificar os contatos e conversas do atendimento em tempo real.
                </p>
            </div>

            {/* Form de Criação / Edição */}
            <LabelForm
                name={name}
                setName={setName}
                color={color}
                setColor={setColor}
                editingLabel={editingLabel}
                setEditingLabel={setEditingLabel}
                handleSaveLabel={handleSaveLabel}
                loading={loading}
                onTransfer={setLabelToTransfer}
            />

            {/* Listagem de Marcadores */}
            <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">
                            Marcadores Cadastrados
                        </h4>
                        {labels.length > 0 && (
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/5 px-2.5 py-1 rounded-full">
                                {filteredLabels.length}
                                {searchTerm && filteredLabels.length !== labels.length ? ` de ${labels.length}` : ''}{' '}
                                {filteredLabels.length === 1 ? 'marcador' : 'marcadores'}
                            </span>
                        )}
                    </div>

                    {labels.length > 0 && (
                        <div className="relative w-full sm:w-60">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                            <input
                                id="input-filter-labels-list"
                                type="text"
                                placeholder="Filtrar marcadores..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-8 pr-7 py-1.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-white rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 text-xs font-bold"
                                    title="Limpar filtro"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {loadingList ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <svg className="animate-spin h-8 w-8 text-blue-500 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-xs">Carregando marcadores...</span>
                    </div>
                ) : labels.length === 0 ? (
                    <div className="text-center py-12 bg-slate-900/40 backdrop-blur-md p-8 rounded-2xl border border-dashed border-white/5 shadow-inner flex flex-col items-center justify-center gap-2">
                        <div className="w-12 h-12 rounded-2xl bg-green-500/5 flex items-center justify-center border border-green-500/10 mb-2 shadow-lg shadow-green-500/5">
                            <FiTag className="text-green-400" size={20} />
                        </div>
                        <p className="text-xs font-black uppercase text-slate-300 tracking-wider">Nenhum Marcador Criado</p>
                        <p className="text-[10px] font-bold text-slate-500 max-w-[200px]">Crie o seu primeiro marcador utilizando o painel de cadastro acima.</p>
                    </div>
                ) : filteredLabels.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50/50 dark:bg-white/5 rounded-2xl border border-dashed border-gray-200 dark:border-white/10 p-4">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Nenhum marcador encontrado com o termo "<strong className="text-gray-700 dark:text-gray-200">{searchTerm}</strong>".
                        </p>
                        <button
                            type="button"
                            onClick={() => setSearchTerm('')}
                            className="mt-2 text-xs font-semibold text-blue-500 hover:underline cursor-pointer"
                        >
                            Limpar busca
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {paginatedLabels.map((label) => (
                                <LabelCard
                                    key={`${label.id}-${label.name}`}
                                    label={label}
                                    onEdit={handleStartEdit}
                                    onDelete={setLabelToDelete}
                                    onTransfer={setLabelToTransfer}
                                />
                            ))}
                        </div>

                        {/* Paginação com no máximo 20 marcadores por página */}
                        <LabelsPagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={filteredLabels.length}
                            itemsPerPage={ITEMS_PER_PAGE}
                            onPageChange={setCurrentPage}
                        />
                    </>
                )}
            </div>

            {/* Modal de Confirmação de Exclusão */}
            <DeleteLabelModal
                labelToDelete={labelToDelete}
                onClose={() => setLabelToDelete(null)}
                onConfirm={handleDeleteLabel}
                deletingId={deletingId}
            />

            {/* Modal de Transferência de Contatos */}
            <TransferLabelModal
                labelToTransfer={labelToTransfer}
                labels={labels}
                onClose={() => setLabelToTransfer(null)}
                onConfirm={handleTransferLabel}
                loading={isTransferring}
            />
        </div>
    );
};

export default LabelsTab;
