import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../config';
import { fetchWithAuth } from '../AuthContext';
import { useClient } from '../contexts/ClientContext';

const RecipientSelector = ({
    onSelect,
    selectedInbox,
    requireOpenWindow = false,
    title = "Destinatários",
    showValidation = true
}) => {
    const { activeClient } = useClient();
    const [mode, setMode] = useState('manual'); // 'manual' | 'upload'
    const [inputText, setInputText] = useState('');
    const [contacts, setContacts] = useState([]); // Array of { phone, status: 'pending'|'valid'|'invalid'|'error', window_open: bool, ... }
    const [isValidating, setIsValidating] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [filterOpenOnly, setFilterOpenOnly] = useState(requireOpenWindow);
    const [showList, setShowList] = useState(false);

    useEffect(() => {
        if (requireOpenWindow) {
            setFilterOpenOnly(true);
        }
    }, [requireOpenWindow]);

    // Filter contacts whenever list or filter changes
    useEffect(() => {
        let list = contacts;
        if ((filterOpenOnly || requireOpenWindow) && showValidation) {
            // Force filter if requireOpenWindow is true, but only if validation is enabled (otherwise we don't know window status)
            list = list.filter(c => c.status === 'verified' && c.window_open);
        }
        onSelect(list);
    }, [contacts, filterOpenOnly, onSelect, requireOpenWindow, showValidation]);

    const handleManualInput = (e) => {
        setInputText(e.target.value);
    };

    const processInput = () => {
        // Extract numbers from text (comma, newline, space separated)
        const raw = inputText.split(/[\n,;]+/);
        const unique = new Set();

        const newContacts = [];
        raw.forEach(r => {
            const clean = r.replace(/\D/g, '');
            if (clean.length >= 10 && !unique.has(clean)) {
                unique.add(clean);
                newContacts.push({
                    phone: clean,
                    original: r.trim(),
                    status: 'pending',
                    window_open: null
                });
            }
        });

        if (newContacts.length === 0) {
            toast.error("Nenhum número válido encontrado.");
            return;
        }

        // Append to existing, filter duplicates by phone
        setContacts(prev => {
            const existing = new Set(prev.map(c => c.phone));
            const uniqueNew = newContacts.filter(c => !existing.has(c.phone));
            return [...prev, ...uniqueNew];
        });

        setInputText(''); // Clear input

        if (showValidation) {
            startValidation(newContacts);
        } else {
            // Mark new as verified and update
            setContacts(prev => {
                const existing = new Set(prev.map(c => c.phone));
                const uniqueNew = newContacts.filter(c => !existing.has(c.phone)).map(c => ({ ...c, status: 'verified' }));
                if (uniqueNew.length > 0) toast.success(`${uniqueNew.length} números adicionados!`);
                return [...prev, ...uniqueNew];
            });
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            // Simple CSV parser for now (assumes phone in first column or auto-detect)
            // Ideally use a library but let's do basic split
            const lines = text.split('\n');
            const newContacts = [];
            const unique = new Set();

            lines.forEach(line => {
                // Try to find a phone number sequence
                const match = line.match(/\d{10,}/);
                if (match) {
                    const clean = match[0];
                    if (!unique.has(clean)) {
                        unique.add(clean);
                        newContacts.push({
                            phone: clean,
                            original: line.trim(),
                            status: 'pending',
                            window_open: null
                        });
                    }
                }
            });

            if (newContacts.length > 0) {
                // Append to existing
                setContacts(prev => {
                    const existing = new Set(prev.map(c => c.phone));
                    const uniqueNew = newContacts.filter(c => !existing.has(c.phone));
                    return [...prev, ...uniqueNew];
                });

                if (showValidation) {
                    startValidation(newContacts);
                } else {
                    setContacts(prev => {
                        const existing = new Set(prev.map(c => c.phone));
                        const uniqueNew = newContacts.filter(c => !existing.has(c.phone)).map(c => ({ ...c, status: 'verified' }));
                        toast.success(`${uniqueNew.length} números adicionados via arquivo!`);
                        return [...prev, ...uniqueNew];
                    });
                }
            } else {
                toast.error("Não foi possível encontrar números no arquivo.");
            }
            e.target.value = ''; // Reset input to allow re-upload
        };
        reader.readAsText(file);
    };

    const startValidation = async (list) => {
        setIsValidating(true);
        setProgress({ current: 0, total: list.length });

        // Deep copy to update status safely
        let currentList = [...list];

        // Process one by one for visual effect
        for (let i = 0; i < list.length; i++) {
            const contact = list[i];

            try {
                const res = await fetchWithAuth(`${API_URL}/chatwoot/validate_contacts`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contacts: [contact.phone],
                        inbox_id: selectedInbox
                    })
                }, activeClient?.id);

                if (res.ok) {
                    const data = await res.json();
                    if (data && data.length > 0) {
                        const result = data[0];
                        // Update item in list
                        currentList[i] = {
                            ...currentList[i],
                            ...result, // Merges status data from backend
                            status: result.exists ? 'verified' : 'not_found',
                            // window_open comes from backend
                        };
                    }
                } else {
                    currentList[i].status = 'error';
                }
            } catch (err) {
                console.error(err);
                currentList[i].status = 'error';
            }

            // Update state every step
            // Update state safely using map
            setContacts(prev => prev.map(c => c.phone === contact.phone ? currentList[i] : c));
            setProgress({ current: i + 1, total: list.length });

            // Emit to parent via effect
            // onSelect(currentList);
        }

        setIsValidating(false);
        toast.success("Validação concluída!");
    };

    const clearAll = () => {
        setContacts([]);
        setInputText('');
        onSelect([]);
        setProgress({ current: 0, total: 0 });
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-100 dark:border-gray-700 transition-colors duration-200">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">{title}</h2>
                {contacts.length > 0 && (
                    <button onClick={clearAll} className="text-xs text-red-500 hover:underline">Limpar Tudo</button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
                <button
                    onClick={() => setMode('manual')}
                    className={`pb-2 px-4 text-sm font-medium ${mode === 'manual' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                >
                    Manual  ✍️
                </button>
                <button
                    onClick={() => setMode('upload')}
                    className={`pb-2 px-4 text-sm font-medium ${mode === 'upload' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                >
                    Upload Arquivo 📂
                </button>
            </div>

            {/* Manual Input */}
            {mode === 'manual' && (
                <div className="space-y-3">
                    <textarea
                        value={inputText}
                        onChange={handleManualInput}
                        placeholder="Cole os números aqui (separados por vírgula ou linha)..."
                        className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none h-32 font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <button
                        onClick={processInput}
                        disabled={!inputText.trim() || isValidating}
                        className="w-full py-2 bg-blue-50 text-blue-600 font-semibold rounded-lg hover:bg-blue-100 transition disabled:opacity-50"
                    >
                        {isValidating ? 'Validando...' : (showValidation ? 'Carregar e Validar Lista' : 'Carregar Lista')}
                    </button>
                </div>
            )}

            {/* Upload Input */}
            {mode === 'upload' && (
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition cursor-pointer relative">
                    <input
                        type="file"
                        accept=".csv,.txt"
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="text-gray-500">
                        <svg className="w-10 h-10 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-sm">Clique para upload ou arraste o arquivo CSV</p>
                        <p className="text-xs text-gray-400 mt-1">Recomendado: 1 coluna com telefones</p>
                    </div>
                </div>
            )}

            {/* Validation Progress */}
            {isValidating && showValidation && (
                <div className="mt-4 animated-fade-in">
                    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                        <span>Validando contatos no Chatwoot...</span>
                        <span>{progress.current} / {progress.total}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(progress.current / progress.total) * 100}%` }}
                        ></div>
                    </div>
                </div>
            )}

            {/* Contact List Results */}
            {contacts.length > 0 && (
                <div className="mt-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setShowList(!showList)}
                            className="text-sm font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors flex items-center gap-1"
                        >
                            {showList ? '👁️ Ocultar Lista' : `👁️ Ver ${contacts.length} contatos carregados`}
                        </button>
                    </div>

                    {showList && (
                        <div className="mt-2 animated-fade-in">
                            <div className="flex justify-between items-center mb-2">
                                {showValidation ? (
                                    requireOpenWindow ? (
                                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 gap-1 border border-green-200 dark:border-green-800/50 select-none">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                            Apenas Janela Aberta (Automático)
                                        </span>
                                    ) : (
                                        <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none bg-gray-50 dark:bg-gray-700 px-3 py-1 rounded border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600">
                                            <input
                                                type="checkbox"
                                                checked={filterOpenOnly}
                                                onChange={(e) => setFilterOpenOnly(e.target.checked)}
                                                className="rounded text-green-600 focus:ring-green-500"
                                            />
                                            <span>Apenas Janela Aberta (24h)</span>
                                        </label>
                                    )
                                ) : (
                                    <span className="text-xs text-gray-400">Lista Carregada</span>
                                )}
                                <span className="text-xs text-gray-400">
                                    {contacts.filter(c => (showValidation && (filterOpenOnly || requireOpenWindow)) ? (c.window_open && c.status === 'verified') : true).length} selecionados
                                </span>
                            </div>

                            <div className="max-h-[300px] overflow-y-auto border border-gray-100 dark:border-gray-700 rounded-lg">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-medium">Número</th>
                                            {showValidation && <th className="px-3 py-2 text-center font-medium">Status</th>}
                                            {showValidation && <th className="px-3 py-2 text-center font-medium">Janela 24h</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {contacts
                                            .filter(c => !showValidation || !filterOpenOnly || (c.status === 'verified' && c.window_open))
                                            .map((c, i) => (
                                                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300 font-mono">{c.phone}</td>

                                                    {/* Existence Status */}
                                                    {showValidation && (
                                                        <td className="px-3 py-2 text-center">
                                                            {c.status === 'pending' && <span className="text-gray-400">⏳</span>}
                                                            {c.status === 'verified' && (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                                                                    Cadastrado
                                                                </span>
                                                            )}
                                                            {c.status === 'not_found' && (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
                                                                    Novo
                                                                </span>
                                                            )}
                                                            {c.status === 'error' && <span className="text-red-500">Erro</span>}
                                                        </td>
                                                    )}

                                                    {/* 24h Window Status */}
                                                    {showValidation && (
                                                        <td className="px-3 py-2 text-center">
                                                            {c.status === 'verified' ? (
                                                                c.window_open ? (
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 gap-1">
                                                                        ● Aberta
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 gap-1">
                                                                        ● Fechada
                                                                    </span>
                                                                )
                                                            ) : (
                                                                <span className="text-gray-300 dark:text-gray-600">-</span>
                                                            )}
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {contacts.length > 0 && contacts.every(c => c.status !== 'pending') && showValidation && showList && (
                <div className="mt-2 text-right">
                    <p className="text-xs text-gray-400">
                        {contacts.filter(c => c.window_open).length} janelas abertas / {contacts.length} total
                    </p>
                </div>
            )}
        </div>
    );
};

export default RecipientSelector;
