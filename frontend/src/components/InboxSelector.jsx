import React, { useEffect, useState, useRef } from 'react';
import { API_URL } from '../config';
import { toast } from 'react-hot-toast';
import { fetchWithAuth } from '../AuthContext';
import { FaWhatsapp, FaTelegramPlane, FaFacebookMessenger, FaGlobe, FaCode, FaEnvelope, FaInbox, FaChevronDown } from 'react-icons/fa';
import { useClient } from '../contexts/ClientContext';

const getChannelIcon = (type) => {
    // Ex: Channel::Whatsapp -> whatsapp
    const cleanType = (type || '').toLowerCase();

    if (cleanType.includes('whatsapp')) return <FaWhatsapp className="w-5 h-5 text-green-500" />;
    if (cleanType.includes('telegram')) return <FaTelegramPlane className="w-5 h-5 text-blue-500" />;
    if (cleanType.includes('facebook')) return <FaFacebookMessenger className="w-5 h-5 text-blue-600" />;
    if (cleanType.includes('webwidget') || cleanType.includes('website')) return <FaGlobe className="w-5 h-5 text-gray-500" />;
    if (cleanType.includes('email')) return <FaEnvelope className="w-5 h-5 text-yellow-500" />;
    if (cleanType.includes('api')) return <FaCode className="w-5 h-5 text-purple-500" />;

    return <FaInbox className="w-5 h-5 text-gray-400" />;
};

const InboxSelector = ({ onSelect }) => {
    const [inboxes, setInboxes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedInbox, setSelectedInbox] = useState(null);
    const dropdownRef = useRef(null);
    const { activeClient } = useClient();

    useEffect(() => {
        if (!activeClient) {
            setLoading(false); // Stop loading if no client
            return;
        }

        let isMounted = true;
        setLoading(true);

        const fetchInboxes = async (retries = 3) => {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 20000);

                // Pass activeClient.id as the 3rd argument (clientId) to fetchWithAuth
                const response = await fetchWithAuth(`${API_URL}/chatwoot/inboxes`, {
                    signal: controller.signal
                }, activeClient?.id);

                clearTimeout(timeoutId);

                if (!response.ok) throw new Error('Falha na requisição');
                const data = await response.json();
                if (isMounted) {
                    const list = Array.isArray(data) ? data : [];
                    setInboxes(list);
                    setSelectedInbox(null); // Reset selection on client switch
                    onSelect(''); // Clear parent selection

                    // Auto-select if there is only one inbox
                    if (list.length === 1) {
                        setSelectedInbox(list[0]);
                        onSelect(list[0].id);
                    }
                    setLoading(false);
                }
            } catch (error) {
                console.error("Erro ao buscar inboxes:", error);
                if (retries > 0 && isMounted) {
                    // console.log(`Tentando novamente... (${retries} restantes)`);
                    setTimeout(() => fetchInboxes(retries - 1), 2000);
                } else if (isMounted) {
                    // toast.error("Falha ao carregar inboxes."); // Suppress toast on mount
                    setLoading(false);
                }
            }
        };

        fetchInboxes();
        return () => { isMounted = false; };
    }, [activeClient]); // Re-run when activeClient changes

    useEffect(() => {
        // Close on click outside logic...
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (inbox) => {
        setSelectedInbox(inbox);
        onSelect(inbox ? inbox.id : '');
        setIsOpen(false);
    };

    if (loading) return <div className="text-sm text-gray-500 mb-4 animate-pulse">Carregando canais...</div>;

    return (
        <div className="mb-6 relative" ref={dropdownRef}>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Filtrar por Canal</label>

            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full p-3 bg-white dark:bg-gray-700/50 border rounded-lg cursor-pointer flex justify-between items-center shadow-sm hover:shadow-md transition dark:text-white ${isOpen ? 'ring-2 ring-blue-400 border-blue-400' : 'border-gray-200 dark:border-gray-600'}`}
            >
                <div className="flex items-center gap-3">
                    {selectedInbox ? (
                        <>
                            {getChannelIcon(selectedInbox.channel_type)}
                            <span className="font-medium text-gray-800 dark:text-gray-200">{selectedInbox.name}</span>
                        </>
                    ) : (
                        <>
                            <FaInbox className="w-5 h-5 text-gray-400" />
                            <span className="text-gray-500">Selecione um canal...</span>
                        </>
                    )}
                </div>
                <FaChevronDown className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-10 top-full mt-2 w-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto animated-fade-in">
                    {inboxes.map(inbox => (
                        <div
                            key={inbox.id}
                            onClick={() => handleSelect(inbox)}
                            className="flex items-center gap-3 p-3 hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer transition text-gray-700 dark:text-gray-200 hover:text-blue-800 dark:hover:text-white"
                        >
                            {getChannelIcon(inbox.channel_type)}
                            <span className="font-medium">{inbox.name}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default InboxSelector;
