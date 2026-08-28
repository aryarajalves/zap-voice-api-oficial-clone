/**
 * Template HTML para exportação do Histórico de Atendimento ZapVoice.
 * Monta o documento com abas por data, painel de Perguntas & Respostas (GPT-5.2) e filtros.
 */

import { EXPORT_CSS } from './exportStyles.js';
import { EXPORT_CLIENT_JS } from './exportScript.js';
import { renderQaPanelHtml, escapeHtml } from './exportQuestionsHelper.js';

export function buildDocHtml({
    contactName,
    phone,
    convoId,
    exportDate,
    totalMessages,
    totalPrivateNotes,
    dateGroups,
    uniqueDates,
    qaData
}) {
    // Renderiza o seletor de visualização principal (Histórico Completo vs Perguntas & Respostas)
    const qaTotal = qaData?.total_questions || (qaData?.qa_items ? qaData.qa_items.length : 0);

    const mainViewSelectorHtml = `
        <div class="main-nav-tabs">
            <button type="button" class="nav-tab-btn active" data-view="chat" onclick="switchMainView('chat')">
                💬 Histórico Completo do Chat <span class="nav-badge">${totalMessages}</span>
            </button>
            <button type="button" class="nav-tab-btn" data-view="qa" onclick="switchMainView('qa')">
                ❓ Perguntas & Respostas (IA) <span class="nav-badge qa-highlight">${qaTotal}</span>
            </button>
        </div>
    `;

    // Renderiza as abas de datas
    let tabsHtml = '';
    if (uniqueDates.length > 1) {
        tabsHtml = `
        <div class="tabs-container" id="date-tabs-container">
            <div class="tabs-label">📅 Filtrar por Data:</div>
            <div class="tabs-bar">
                <button type="button" class="tab-btn active" data-date="all" onclick="selectDateTab('all')">
                    📅 Todas as Datas <span class="tab-badge" id="badge-all">${totalMessages}</span>
                </button>
                ${uniqueDates.map(d => `
                    <button type="button" class="tab-btn" data-date="${escapeHtml(d.key)}" onclick="selectDateTab('${escapeHtml(d.key)}')">
                        ${escapeHtml(d.key)} <span class="tab-badge" data-date-badge="${escapeHtml(d.key)}">${d.count}</span>
                    </button>
                `).join('')}
            </div>
        </div>
        `;
    }

    // Renderiza os grupos de mensagens por data
    const dateGroupsHtml = dateGroups.map(group => {
        return `
            <div class="date-group" data-date="${escapeHtml(group.dateKey)}">
                <div class="date-separator">
                    <span class="date-badge">📅 ${escapeHtml(group.dateLabel || group.dateKey)} (${group.messages.length} ${group.messages.length === 1 ? 'mensagem' : 'mensagens'})</span>
                </div>
                <div class="date-group-messages">
                    ${group.messagesHtml.join('\n')}
                </div>
            </div>
        `;
    }).join('\n');

    // Painel de Perguntas & Respostas (GPT-5.2)
    const qaPanelHtml = renderQaPanelHtml(qaData);

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Histórico de Conversa - ${escapeHtml(contactName)}</title>
<style>
${EXPORT_CSS}
</style>
</head>
<body>
    <div class="page-container">
        <!-- Barra de Ações Superior com Filtro e Botão de Impressão -->
        <div class="action-bar">
            <div class="action-left">
                <span class="action-title">📄 Relatório de Atendimento & Auditoria IA</span>
                <label class="filter-private-container" id="filter-private-container" title="Ocultar ou exibir anotações e mensagens privadas do sistema">
                    <input type="checkbox" id="toggle-private-notes" onchange="togglePrivateNotes(this.checked)">
                    <span class="filter-private-label">🔒 Ocultar anotações privadas</span>
                </label>
            </div>
            <button onclick="window.print()" class="btn-print" title="Salvar conversa como PDF ou imprimir">
                🖨️ Salvar como PDF / Imprimir
            </button>
        </div>

        <!-- Cabeçalho -->
        <div class="header">
            <h1>📋 Histórico de Atendimento - ZapVoice</h1>
            <div class="meta-info">
                <strong>Contato / Usuário:</strong> ${escapeHtml(contactName)}<br>
                <strong>Telefone:</strong> <span class="meta-tag">${escapeHtml(phone)}</span> | <strong>ID da Conversa:</strong> <span class="meta-tag">#${escapeHtml(String(convoId))}</span><br>
                <strong>Data da Exportação:</strong> ${escapeHtml(exportDate)} | <strong>Total de Mensagens:</strong> <span class="meta-tag" id="meta-total-msgs">${totalMessages}</span>
                ${totalPrivateNotes > 0 ? `<span class="private-notes-count-badge" id="meta-private-notes-badge">🔒 ${totalPrivateNotes} anotações privadas</span>` : ''}
            </div>
        </div>

        <!-- Seletor Principal de Visualização (Chat Completo vs Perguntas & Respostas) -->
        ${mainViewSelectorHtml}

        <!-- Abas de Navegação por Data (Apenas no modo Chat) -->
        ${tabsHtml}

        <!-- Visualização 1: Corpo com Mensagens Agrupadas por Data -->
        <div class="conversation-body" id="conversation-body">
            ${dateGroupsHtml || '<p style="color: #64748b; font-style: italic; text-align: center; padding: 20px;">Nenhuma mensagem registrada nesta conversa.</p>'}
        </div>

        <!-- Visualização 2: Painel de Perguntas & Respostas com Auditoria GPT-5.2 -->
        ${qaPanelHtml}

        <div class="footer">
            Documento gerado automaticamente pelo sistema ZapVoice - API Oficial do WhatsApp
        </div>
    </div>

    <script>
${EXPORT_CLIENT_JS}
    </script>
</body>
</html>
    `.trim();
}
