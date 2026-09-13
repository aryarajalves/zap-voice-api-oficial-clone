import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../../config';
import { fetchWithAuth } from '../../../../AuthContext';
import { getAvailableDdiDdd } from '../../../../utils/dddInfo';

export function useTriggerContactsLoader({
    activeClient,
    contactsModal,
    setContactsModal,
    setTriggers
}) {
    const [contactsFilter, setContactsFilter] = useState('all');
    const [contactsTypeFilter, setContactsTypeFilter] = useState('all');
    const [contactsErrorFilter, setContactsErrorFilter] = useState('all');
    const [contactsSearchPhone, setContactsSearchPhone] = useState('');
    const [contactsFilterDdi, setContactsFilterDdi] = useState('');
    const [contactsFilterDdd, setContactsFilterDdd] = useState('');
    const [contactsDdiOptions, setContactsDdiOptions] = useState([]);
    const [contactsDddOptions, setContactsDddOptions] = useState([]);
    const [loadingContacts, setLoadingContacts] = useState(false);
    const [contactsPage, setContactsPage] = useState(1);
    const [contactsPerPage, setContactsPerPage] = useState(20);
    const [contactsTotal, setContactsTotal] = useState(0);

    const fetchTriggerContacts = async () => {
        if (!contactsModal?.triggerId) return;
        setLoadingContacts(true);
        try {
            let url = `${API_URL}/triggers/${contactsModal.triggerId}/messages`;
            const params = new URLSearchParams();

            if (contactsFilter === 'total') {
                const resT = await fetchWithAuth(`${API_URL}/triggers/${contactsModal.triggerId}`, {}, activeClient?.id);
                if (resT.ok) {
                    const trig = await resT.json();
                    const raw = trig.contacts_list || [];

                    const allFormatted = raw.map(c => {
                        const phone = typeof c === 'string' ? c : (c.phone || c.whatsapp || c.telefone || c.contact_phone || c.phone_number || c.number || c.meta?.sender?.phone_number || '');
                        const name = typeof c === 'object' ? (c.nome || c.name || c.full_name || c.contact_name || c.meta?.sender?.name || c['{{1}}'] || c['1'] || '') : '';
                        return {
                            phone_number: phone,
                            contact_name: name,
                            status: 'pending',
                            timestamp: trig.created_at,
                            is_bulk_raw: true
                        };
                    });

                    const cleanSearch = contactsSearchPhone ? contactsSearchPhone.replace(/\D/g, '') : '';
                    const cleanDdi = contactsFilterDdi ? contactsFilterDdi.replace(/\D/g, '') : '';
                    const cleanDdd = contactsFilterDdd ? contactsFilterDdd.replace(/\D/g, '') : '';

                    const filtered = allFormatted.filter(c => {
                        const digits = (c.phone_number || '').replace(/\D/g, '');
                        if (cleanSearch && !digits.includes(cleanSearch)) return false;
                        if (cleanDdi && !digits.startsWith(cleanDdi)) return false;
                        if (cleanDdd && !(digits.startsWith(`55${cleanDdd}`) || digits.startsWith(cleanDdd))) return false;
                        return true;
                    });

                    const start = (contactsPage - 1) * contactsPerPage;
                    const paginated = filtered.slice(start, start + contactsPerPage);

                    const optionsSource = cleanSearch
                        ? allFormatted.filter(c => (c.phone_number || '').replace(/\D/g, '').includes(cleanSearch))
                        : allFormatted;
                    const { ddis, ddds } = getAvailableDdiDdd(optionsSource.map(c => c.phone_number));
                    if (!contactsFilterDdi) setContactsDdiOptions(ddis);
                    if (!contactsFilterDdd) setContactsDddOptions(ddds);

                    setContactsTotal(filtered.length);
                    setContactsModal(prev => ({
                        ...prev,
                        contacts: paginated,
                        counts: { total: filtered.length }
                    }));
                    setLoadingContacts(false);
                    return;
                }
            }

            if (contactsFilter !== 'all') params.append('status_filter', contactsFilter);
            if (contactsTypeFilter !== 'all') params.append('message_type', contactsTypeFilter);
            if ((contactsFilter === 'failed' || contactsFilter === 'blocked') && contactsErrorFilter !== 'all') {
                params.append('failure_reason', contactsErrorFilter);
            }
            if (contactsSearchPhone) params.append('search_phone', contactsSearchPhone);
            if (contactsFilterDdi) params.append('filter_ddi', contactsFilterDdi);
            if (contactsFilterDdd) params.append('filter_ddd', contactsFilterDdd);
            
            params.append('limit', contactsPerPage);
            params.append('skip', (contactsPage - 1) * contactsPerPage);
            const queryString = params.toString();
            if (queryString) url += `?${queryString}`;

            const res = await fetchWithAuth(url, {}, activeClient?.id);
            if (res.ok) {
                const data = await res.json();
                setContactsTotal(typeof data.total === 'number' ? data.total : (data.counts?.all || 0));
                setContactsModal(prev => ({
                    ...prev,
                    contacts: data.items || [],
                    counts: data.counts || {},
                    failureReasons: data.failure_reasons || []
                }));

                const phones = (data.items || []).map(i => i.phone_number || i.phone).filter(Boolean);
                const { ddis, ddds } = getAvailableDdiDdd(phones);
                if (!contactsFilterDdi) setContactsDdiOptions(ddis);
                if (!contactsFilterDdd) setContactsDddOptions(ddds);

                if (data.counts && setTriggers) {
                    const countsPatch = {
                        total_sent: data.counts.sent,
                        total_delivered: data.counts.delivered,
                        total_read: data.counts.read,
                        total_interactions: data.counts.interaction,
                        total_failed: data.counts.failed,
                        total_blocked: data.counts.blocked,
                        queue_count: data.counts.queue,
                        total_contacts: data.counts.all
                    };
                    setTriggers(prev => prev.map(t => t.id === contactsModal.triggerId ? { ...t, ...countsPatch } : t));
                }
            }
        } catch (e) {
            console.error("Erro ao carregar lista de contatos:", e);
            toast.error("Erro ao carregar lista de contatos: " + e.message);
        } finally {
            setLoadingContacts(false);
        }
    };

    useEffect(() => {
        if (contactsModal?.isOpen && contactsModal?.triggerId) {
            fetchTriggerContacts();
        }
    }, [
        contactsFilter,
        contactsTypeFilter,
        contactsErrorFilter,
        contactsSearchPhone,
        contactsFilterDdi,
        contactsFilterDdd,
        contactsModal?.isOpen,
        contactsModal?.triggerId,
        contactsPage,
        contactsPerPage
    ]);

    const handleViewContacts = (trigger, initialFilter = 'all') => {
        const filterLabels = {
            total: 'Total na Lista',
            sent: 'Enviados',
            queue: 'Fila (Meta)',
            delivered: 'Recebidas',
            read: 'Lidos',
            failed: 'Falhas',
            interaction: 'Interações',
            blocked: 'Bloqueados',
            skipped: 'Pulados (24h)',
            free: 'Gratuitas',
            template: 'Templates',
            private_note: 'Notas Privadas',
            remaining: 'Restantes'
        };
        setContactsFilter(initialFilter);
        setContactsPage(1);
        setContactsPerPage(20);
        setContactsErrorFilter('all');
        const label = filterLabels[initialFilter];
        setContactsModal({
            isOpen: true,
            title: label ? `${label} — ${trigger.funnel?.name || trigger.template_name || 'Envio em Massa'}` : `Contatos — ${trigger.funnel?.name || 'Envio em Massa'}`,
            triggerId: trigger.id,
            triggerStatus: trigger.status,
            isTemplate: !!trigger.template_name,
            showTabs: initialFilter === 'all',
            contacts: [],
            counts: {}
        });
    };

    return {
        contactsFilter, setContactsFilter,
        contactsTypeFilter, setContactsTypeFilter,
        contactsErrorFilter, setContactsErrorFilter,
        contactsSearchPhone, setContactsSearchPhone,
        contactsFilterDdi, setContactsFilterDdi,
        contactsFilterDdd, setContactsFilterDdd,
        contactsDdiOptions, setContactsDdiOptions,
        contactsDddOptions, setContactsDddOptions,
        loadingContacts, setLoadingContacts,
        contactsPage, setContactsPage,
        contactsPerPage, setContactsPerPage,
        contactsTotal, setContactsTotal,
        fetchTriggerContacts,
        handleViewContacts
    };
}
