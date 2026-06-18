import { 
    FiMessageSquare, FiMic, FiImage, FiClock, FiCpu, 
    FiShuffle, FiTag, FiCalendar, FiGlobe, FiUser,
    FiFileText, FiLink, FiGift, FiTarget, FiSliders,
    FiZap, FiActivity, FiDatabase
} from 'react-icons/fi';

export const getNodeConfig = (type, data) => {
    switch (type) {
        case 'messageNode':
        case 'message':
            return { icon: FiMessageSquare, color: 'text-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200/50 dark:border-blue-800/30', title: 'Mensagem' };
        case 'audioNode':
        case 'audio':
            return { icon: FiMic, color: 'text-purple-500', bgColor: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200/50 dark:border-purple-800/30', title: 'Áudio / Voz' };
        case 'mediaNode':
        case 'media':
            return { icon: FiImage, color: 'text-indigo-500', bgColor: 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200/50 dark:border-indigo-800/30', title: 'Mídia / Arquivo' };
        case 'delayNode':
        case 'delay': {
            const isRandom = data.useRandom ?? false;
            let titleText = '';
            if (isRandom) {
                titleText = `Aguardar ${data.minTime || data.time || 10}s a ${data.maxTime || data.minTime || data.time || 10}s`;
            } else {
                const timeVal = data.time || data.delay || 10;
                const unitVal = data.unit || 'seconds';
                const unitAbbr = unitVal === 'seconds' ? 's' : unitVal === 'minutes' ? 'm' : unitVal === 'hours' ? 'h' : 'd';
                titleText = `Aguardar ${timeVal}${unitAbbr}`;
            }
            return { icon: FiClock, color: 'text-orange-500', bgColor: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200/50 dark:border-orange-800/30', title: titleText };
        }
        case 'conditionNode':
        case 'condition':
            return { icon: FiCpu, color: 'text-rose-500', bgColor: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200/50 dark:border-rose-800/30', title: 'Condição Inteligente' };
        case 'randomizerNode':
        case 'randomizer':
            return { icon: FiShuffle, color: 'text-amber-500', bgColor: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200/50 dark:border-amber-800/30', title: 'Roteamento Dinâmico' };
        case 'chatwoot_label':
        case 'labelNode':
            return { icon: FiTag, color: 'text-emerald-500', bgColor: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/50 dark:border-emerald-800/30', title: 'Etiquetar Chatwoot' };
        case 'dateNode':
        case 'date':
            return { icon: FiCalendar, color: 'text-violet-500', bgColor: 'bg-violet-50 dark:bg-violet-950/30 border-violet-200/50 dark:border-violet-800/30', title: 'Agendamento Data' };
        case 'businessHoursNode':
        case 'business_hours':
            return { icon: FiClock, color: 'text-indigo-500', bgColor: 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200/50 dark:border-indigo-800/30', title: 'Horário Comercial' };
        case 'httpRequestNode':
        case 'http_request':
            return { icon: FiGlobe, color: 'text-emerald-500', bgColor: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/50 dark:border-emerald-800/30', title: 'Requisição HTTP' };
        case 'updateContactNode':
        case 'update_contact':
            return { icon: FiUser, color: 'text-orange-500', bgColor: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200/50 dark:border-orange-800/30', title: 'Atualizar Contato' };
        case 'templateNode':
        case 'template':
            return { icon: FiFileText, color: 'text-cyan-500', bgColor: 'bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200/50 dark:border-cyan-800/30', title: 'Template WhatsApp' };
        case 'sendTemplateNode':
        case 'send_template':
            return { icon: FiFileText, color: 'text-cyan-600', bgColor: 'bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200/50 dark:border-cyan-800/30', title: 'Disparo de Template' };
        case 'linkFunnelNode':
        case 'link_funnel':
            return { icon: FiLink, color: 'text-teal-500', bgColor: 'bg-teal-50 dark:bg-teal-950/30 border-teal-200/50 dark:border-teal-800/30', title: 'Conectar Funil' };
        case 'rouletteNode':
        case 'roulette':
            return { icon: FiGift, color: 'text-pink-500', bgColor: 'bg-pink-50 dark:bg-pink-950/30 border-pink-200/50 dark:border-pink-800/30', title: 'Roleta / Sorteio' };
        case 'localSegmentNode':
        case 'local_segment':
            return { icon: FiTag, color: 'text-rose-600', bgColor: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200/50 dark:border-rose-800/30', title: 'Segmentação Local' };
        case 'pixelNode':
        case 'pixel':
            return { icon: FiTarget, color: 'text-red-500', bgColor: 'bg-red-50 dark:bg-red-950/30 border-red-200/50 dark:border-red-800/30', title: 'Disparar Pixel' };
        case 'crmActionsNode':
        case 'crm_actions':
            return { icon: FiSliders, color: 'text-sky-500', bgColor: 'bg-sky-50 dark:bg-sky-950/30 border-sky-200/50 dark:border-sky-800/30', title: 'Ações de CRM' };
        case 'hotLeadsNode':
        case 'hot_leads':
            return { icon: FiZap, color: 'text-yellow-500', bgColor: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200/50 dark:border-yellow-800/30', title: 'Leads Quentes' };
        case 'checkWindowNode':
        case 'check_window':
            return { icon: FiClock, color: 'text-indigo-600', bgColor: 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200/50 dark:border-indigo-800/30', title: 'Verificar Janela 24h' };
        case 'waitEventNode':
        case 'wait_event':
            return { icon: FiActivity, color: 'text-amber-600', bgColor: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200/50 dark:border-amber-800/30', title: 'Aguardar Ação' };
        case 'inputDataNode':
        case 'input_data':
        case 'await_response':
            return { icon: FiDatabase, color: 'text-rose-500', bgColor: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200/50 dark:border-rose-800/30', title: 'Entrada de Dados' };
        default:
            return { icon: FiZap, color: 'text-slate-500', bgColor: 'bg-slate-50 dark:bg-slate-900 border-slate-200/50 dark:border-slate-800', title: 'Passo do Funil' };
    }
};

export const getStatusStyles = (status) => {
    switch (status) {
        case 'completed':
            return { borderClass: 'border-green-500/60 dark:border-green-600/50' };
        case 'processing':
        case 'started':
            return { borderClass: 'border-blue-500/60 dark:border-blue-600/50' };
        case 'waiting':
        case 'suspended':
            return { borderClass: 'border-orange-500/60 dark:border-orange-600/50' };
        case 'failed':
            return { borderClass: 'border-red-500/60 dark:border-red-600/50' };
        default:
            return { borderClass: 'border-gray-200 dark:border-gray-800' };
    }
};

export const resolveUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const baseUrl = (window.API_URL || '').replace(/\/api\/*$/, '') || 'http://localhost:8000';
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};

const TYPE_DISPLAY_NAMES = {
    message: 'Mensagem', messageNode: 'Mensagem',
    date: 'Agendamento Data', dateNode: 'Agendamento Data',
    audio: 'Áudio', audioNode: 'Áudio',
    media: 'Mídia / Arquivo', mediaNode: 'Mídia / Arquivo',
    delay: 'Agendamento Delay', delayNode: 'Agendamento Delay',
    condition: 'Condição', conditionNode: 'Condição',
    randomizer: 'Divisor A/B', randomizerNode: 'Divisor A/B',
    labelNode: 'Adicionar Etiqueta', chatwoot_label: 'Adicionar Etiqueta',
    httpRequestNode: 'Requisição HTTP', http_request: 'Requisição HTTP',
    businessHoursNode: 'Horário Comercial', business_hours: 'Horário Comercial',
    updateContactNode: 'Atualizar Contato', update_contact: 'Atualizar Contato',
    templateNode: 'Template WhatsApp', template: 'Template WhatsApp',
    sendTemplateNode: 'Disparo de Template', send_template: 'Disparo de Template',
    linkFunnelNode: 'Conectar Funil', link_funnel: 'Conectar Funil',
    rouletteNode: 'Roleta / Sorteio', roulette: 'Roleta / Sorteio',
    localSegmentNode: 'Segmentação Local', local_segment: 'Segmentação Local',
    pixelNode: 'Disparar Pixel', pixel: 'Disparar Pixel',
    crmActionsNode: 'Ações de CRM', crm_actions: 'Ações de CRM',
    hotLeadsNode: 'Leads Quentes', hot_leads: 'Leads Quentes',
    checkWindowNode: 'Verificar Janela 24h', check_window: 'Verificar Janela 24h',
    waitEventNode: 'Aguardar Ação', wait_event: 'Aguardar Ação',
    inputDataNode: 'Entrada de Dados', input_data: 'Entrada de Dados',
    await_response: 'Entrada de Dados',
};

export const getDisplayName = (type, data) => {
    const label = data.label || data.name || '';
    if (label && label.toLowerCase() !== 'passo') return label;
    return TYPE_DISPLAY_NAMES[type] || 'Passo';
};
