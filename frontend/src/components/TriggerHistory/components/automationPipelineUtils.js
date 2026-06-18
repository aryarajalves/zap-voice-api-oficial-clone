export const calculateNodeOrderMap = (trigger) => {
    const funnelNodes = trigger.funnel?.steps?.nodes || [];
    const funnelEdges = trigger.funnel?.steps?.edges || [];

    const nodeOrderMap = {};
    const adj = {};
    const inDegree = {};
    
    funnelNodes.forEach(node => {
        adj[node.id] = [];
        inDegree[node.id] = 0;
    });
    
    funnelEdges.forEach(edge => {
        if (adj[edge.source] && adj[edge.target] !== undefined) {
            adj[edge.source].push(edge.target);
            inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
        }
    });
    
    let startNodes = funnelNodes.filter(node => 
        node.type === 'start' || 
        node.data?.isStart === true
    ).map(n => n.id);
    
    if (startNodes.length === 0) {
        startNodes = funnelNodes.filter(node => (inDegree[node.id] || 0) === 0).map(n => n.id);
    }
    
    if (startNodes.length === 0 && funnelNodes.length > 0) {
        startNodes = [funnelNodes[0].id];
    }
    
    const queue = startNodes.map(id => ({ id, level: 0 }));
    const visited = new Set();
    
    while (queue.length > 0) {
        const { id, level } = queue.shift();
        nodeOrderMap[id] = Math.max(nodeOrderMap[id] || 0, level);
        
        const visitKey = `${id}-${level}`;
        if (visited.has(visitKey)) continue;
        visited.add(visitKey);
        
        if (adj[id]) {
            adj[id].forEach(nextId => {
                if (level < funnelNodes.length) {
                    queue.push({ id: nextId, level: level + 1 });
                }
            });
        }
    }
    
    funnelNodes.forEach((node, idx) => {
        if (nodeOrderMap[node.id] === undefined) {
            nodeOrderMap[node.id] = idx + 1000;
        }
    });

    return nodeOrderMap;
};

export const filterContactsByNodeStatus = (trigger, nodeId, clickedStatus, nodeOrderMap) => {
    const rawHistory = Array.isArray(trigger.execution_history) ? trigger.execution_history : [];
    const logsByContact = {};

    rawHistory.forEach(log => {
        const currentLogNodeId = log.node_id;
        if (!currentLogNodeId) return;

        const phone = log.extra?.contact_phone || log.extra?.contact_name || '__single__';
        if (!logsByContact[phone]) logsByContact[phone] = [];
        logsByContact[phone].push({
            ...log,
            nodeOrder: nodeOrderMap[currentLogNodeId] ?? 999
        });
    });

    const uniqueContactsMap = {};

    Object.entries(logsByContact).forEach(([phone, contactLogs]) => {
        const realNodeLogs = contactLogs.filter(l => l.nodeOrder < 999);
        const maxNodeOrder = realNodeLogs.length > 0 ? Math.max(...realNodeLogs.map(l => l.nodeOrder)) : -1;

        const logForNode = contactLogs.find(l => l.node_id === nodeId);
        if (!logForNode) return;

        const isWaiting = logForNode.status === 'waiting' || logForNode.status === 'processing';
        const isSuspended = logForNode.status === 'suspended';
        const alreadyMoved = (isWaiting || isSuspended) && logForNode.nodeOrder < maxNodeOrder;

        let effectiveStatus;
        if (logForNode.status === 'completed' || alreadyMoved) {
            effectiveStatus = 'completed';
        } else if (isWaiting) {
            effectiveStatus = 'waiting';
        } else if (isSuspended) {
            effectiveStatus = 'suspended';
        } else if (logForNode.status === 'failed') {
            effectiveStatus = 'failed';
        } else if (logForNode.status === 'cancelled') {
            effectiveStatus = 'cancelled';
        } else {
            return;
        }

        if (effectiveStatus !== clickedStatus) return;

        if (!uniqueContactsMap[phone]) {
            uniqueContactsMap[phone] = {
                name: logForNode.extra?.contact_name || 'Contato ZapVoice',
                phone: logForNode.extra?.contact_phone || 'N/A',
                status: logForNode.status,
                timestamp: logForNode.timestamp,
                updated_at: logForNode.updated_at,
                targetTime: logForNode.extra?.target_time,
                error: logForNode.extra?.error,
                details: logForNode.details,
                convoId: logForNode.extra?.conversation_id || trigger.conversation_id,
                accountId: logForNode.extra?.account_id || trigger.chatwoot_account_id,
                triggerId: logForNode.extra?.trigger_id || trigger.id
            };
        }
    });

    return Object.values(uniqueContactsMap);
};
