export const createNodeDefaultData = (type, callbacks = {}) => {
    const defaultData = {
        onChange: callbacks.onChange,
        onDelete: callbacks.onDelete,
        onSetStart: callbacks.onSetStart,
        onDuplicate: callbacks.onDuplicate
    };

    if (type === 'delayNode') {
        defaultData.time = 10;
        defaultData.unit = 'seconds';
        defaultData.useRandom = false;
    } else if (type === 'dateNode') {
        defaultData.mode = 'date';
        defaultData.dateValue = '';
        defaultData.timeValue = '12:00';
    } else if (type === 'messageNode') {
        defaultData.content = '';
        defaultData.variations = [];
    } else if (type === 'randomizerNode') {
        defaultData.percentA = 50;
    } else if (type === 'conditionNode') {
        defaultData.conditionType = 'text';
    } else if (type === 'httpRequestNode') {
        defaultData.method = 'POST';
        defaultData.url = '';
        defaultData.headers = [{ key: '', value: '' }];
        defaultData.payloadType = 'fields';
        defaultData.payloadFields = [{ key: '', value: '' }];
        defaultData.payloadRaw = '';
    } else if (type === 'rouletteNode') {
        defaultData.winChance = 10;
        defaultData.dailyLimit = 5;
    } else if (type === 'hotLeadsNode') {
        defaultData.alertName = 'Interesse Mentoria';
        defaultData.priority = 'Média';
        defaultData.contextMessage = '';
        defaultData.sellersQueueType = 'all';
        defaultData.selectedSellerIds = [];
        defaultData.distributionMode = 'round_robin';
    } else if (type === 'localSegmentNode') {
        defaultData.action = 'add_tag';
        defaultData.tagName = '';
    } else if (type === 'pixelNode') {
        defaultData.pixelId = '';
        defaultData.accessToken = '';
        defaultData.eventName = 'Lead';
        defaultData.value = '';
        defaultData.currency = 'BRL';
    } else if (type === 'crmActionsNode') {
        defaultData.platform = 'chatwoot';
        defaultData.action = 'chatwoot_label';
        defaultData.value = '';
    } else if (type === 'businessHoursNode') {
        defaultData.schedule = {
            '0': { open: true, start: '08:00', end: '18:00' },
            '1': { open: true, start: '08:00', end: '18:00' },
            '2': { open: true, start: '08:00', end: '18:00' },
            '3': { open: true, start: '08:00', end: '18:00' },
            '4': { open: true, start: '08:00', end: '18:00' },
            '5': { open: true, start: '08:00', end: '12:00' },
            '6': { open: false, start: '08:00', end: '18:00' }
        };
        defaultData.waitUntilOpen = false;
    } else if (type === 'sendTemplateNode') {
        defaultData.templateName = '';
        defaultData.language = 'pt_BR';
        defaultData.mappings = [];
    } else if (type === 'waitEventNode') {
        defaultData.eventType = 'compra_aprovada';
        defaultData.waitValue = 1;
        defaultData.waitUnit = 'hours';
    } else if (type === 'inputDataNode') {
        defaultData.collectionType = 'traditional';
        defaultData.varName = '';
        defaultData.validationRule = 'none';
        defaultData.aiInstructions = '';
        defaultData.timeoutValue = 2;
        defaultData.timeoutUnit = 'hours';
        defaultData.errorMessage = '';
    } else if (type === 'newConversationNode') {
        defaultData.routes = [
            { id: 'route_1', label: 'Suporte / Dúvidas', phrases: 'ajuda, suporte, duvida, problema', matchType: 'contains' },
            { id: 'route_2', label: 'Vendas / Preço', phrases: 'comprar, preco, valor, plano, assinar', matchType: 'contains' }
        ];
    } else if (type === 'folderNode') {
        defaultData.title = 'Nova Pasta / Seção';
        defaultData.description = '';
        defaultData.color = 'purple';
    }

    return defaultData;
};
