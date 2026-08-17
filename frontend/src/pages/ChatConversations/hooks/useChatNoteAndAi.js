import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { fetchWithAuth } from '../../../AuthContext';
import { API_URL } from '../../../config';

export function useChatNoteAndAi({ engine, selectedConvo, setSelectedConvo, activeClient }) {
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [editingNoteText, setEditingNoteText] = useState('');
    const [isSavingNoteMsg, setIsSavingNoteMsg] = useState(false);
    const [isNoteModalMaximized, setIsNoteModalMaximized] = useState(false);
    const [deleteNoteConfirmMsgId, setDeleteNoteConfirmMsgId] = useState(null);
    const [isDeletingNoteMsg, setIsDeletingNoteMsg] = useState(false);

    const [isOpenAiConfigured, setIsOpenAiConfigured] = useState(false);
    const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
    const [aiReportData, setAiReportData] = useState(null);
    const [isAiReportModalOpen, setIsAiReportModalOpen] = useState(false);

    useEffect(() => {
        const checkAiConfig = async () => {
            try {
                const res = await fetchWithAuth(`${API_URL}/chat/ai-config`, {}, activeClient?.id);
                if (res.ok) {
                    const data = await res.json();
                    setIsOpenAiConfigured(!!data.openai_configured);
                }
            } catch (err) {
                console.error('Erro ao verificar AI config:', err);
            }
        };
        checkAiConfig();
    }, [activeClient?.id]);

    const handleSaveEditedNote = async (msgId) => {
        if (!editingNoteText.trim() || !selectedConvo) return;
        setIsSavingNoteMsg(true);
        try {
            const res = await fetchWithAuth(
                `${API_URL}/chat/conversations/${selectedConvo.id}/notes/${msgId}`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ private_note: editingNoteText.trim() })
                },
                activeClient?.id
            );

            if (res.ok) {
                const data = await res.json();
                const updatedContent = data.message?.content || `🔒 Anotação Privada: ${editingNoteText.trim()}`;

                engine.setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: updatedContent } : m));
                setSelectedConvo(prev => ({ ...prev, private_note: editingNoteText.trim() }));
                engine.setConversations(prev => prev.map(c => c.id === selectedConvo.id ? { ...c, private_note: editingNoteText.trim() } : c));
                engine.setPrivateNote('');

                toast.success('Anotação privada atualizada!');
                setEditingNoteId(null);
                setEditingNoteText('');
            } else {
                const err = await res.json();
                throw new Error(err.detail || 'Erro ao atualizar anotação.');
            }
        } catch (err) {
            toast.error(err.message || 'Erro ao salvar anotação.');
        } finally {
            setIsSavingNoteMsg(false);
        }
    };

    const handleDeleteNoteMsg = async (msgId) => {
        if (!msgId || !selectedConvo) return;
        setIsDeletingNoteMsg(true);
        try {
            const res = await fetchWithAuth(
                `${API_URL}/chat/conversations/${selectedConvo.id}/messages/${msgId}`,
                { method: 'DELETE' },
                activeClient?.id
            );

            if (res.ok) {
                engine.setMessages(prev => prev.filter(m => m.id !== msgId));

                const remainingNotes = engine.messages.filter(m => m.id !== msgId && m.sender_type === 'system' && m.content?.startsWith('🔒 Anotação Privada:'));
                const newestNote = remainingNotes.length > 0 ? remainingNotes[remainingNotes.length - 1].content.replace('🔒 Anotação Privada: ', '') : '';

                setSelectedConvo(prev => ({ ...prev, private_note: newestNote }));
                engine.setConversations(prev => prev.map(c => c.id === selectedConvo.id ? { ...c, private_note: newestNote } : c));
                engine.setPrivateNote('');

                toast.success('Anotação privada excluída!');
                setDeleteNoteConfirmMsgId(null);
            } else {
                const err = await res.json();
                throw new Error(err.detail || 'Erro ao excluir anotação.');
            }
        } catch (err) {
            toast.error(err.message || 'Erro ao excluir anotação.');
        } finally {
            setIsDeletingNoteMsg(false);
        }
    };

    const handleAnalyzeSingleChatDoubts = async () => {
        if (!selectedConvo || isAnalyzingAi) return;
        setIsAnalyzingAi(true);
        try {
            const res = await fetchWithAuth(
                `${API_URL}/chat/conversations/${selectedConvo.id}/analyze-doubts`,
                { method: 'POST' },
                activeClient?.id
            );

            if (res.ok) {
                const data = await res.json();
                setAiReportData({
                    title: `Análise de Dúvidas (IA) — ${data.contact_name}`,
                    raw_report: data.raw_report,
                    has_unanswered_doubts: data.has_unanswered_doubts,
                    isBulk: false
                });
                setIsAiReportModalOpen(true);
                toast.success('Análise de dúvidas por IA concluída!');
            } else {
                const err = await res.json();
                throw new Error(err.detail || 'Erro ao analisar dúvidas com IA.');
            }
        } catch (err) {
            toast.error(err.message || 'Erro ao analisar dúvidas.');
        } finally {
            setIsAnalyzingAi(false);
        }
    };

    const handleAnalyzeBulkChatsDoubts = async () => {
        if (!engine.selectedConversationIds || engine.selectedConversationIds.length === 0 || isAnalyzingAi) return;
        setIsAnalyzingAi(true);
        try {
            const res = await fetchWithAuth(
                `${API_URL}/chat/conversations/analyze-doubts-bulk`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ conversation_ids: engine.selectedConversationIds })
                },
                activeClient?.id
            );

            if (res.ok) {
                const data = await res.json();
                setAiReportData({
                    title: `Relatório Consolidado de Dúvidas (IA) — ${data.total_analyzed} Conversas`,
                    raw_report: data.raw_report,
                    has_unanswered_doubts: data.has_unanswered_doubts,
                    total_analyzed: data.total_analyzed,
                    isBulk: true
                });
                setIsAiReportModalOpen(true);
                toast.success(`Análise de ${data.total_analyzed} conversas concluída!`);
            } else {
                const err = await res.json();
                throw new Error(err.detail || 'Erro ao analisar conversas em massa.');
            }
        } catch (err) {
            toast.error(err.message || 'Erro ao analisar conversas.');
        } finally {
            setIsAnalyzingAi(false);
        }
    };

    const exportAiReportHtml = () => {
        if (!aiReportData) return;
        const reportTitle = aiReportData.title || 'Relatório de Dúvidas IA';
        const dateStr = new Date().toLocaleString('pt-BR');

        const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${reportTitle}</title>
<style>
    body { font-family: 'Calibri', 'Segoe UI', system-ui, Arial, sans-serif; margin: 0; padding: 30px; color: #0f172a; background-color: #f8fafc; }
    .container { max-width: 860px; margin: 0 auto; background: #ffffff; padding: 35px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { border-bottom: 2px solid #8b5cf6; padding-bottom: 15px; margin-bottom: 25px; }
    .header h1 { color: #5b21b6; font-size: 22px; margin: 0 0 8px 0; }
    .meta { font-size: 13px; color: #64748b; margin-bottom: 20px; }
    .content { font-size: 14px; line-height: 1.6; white-space: pre-wrap; color: #1e293b; background: #faf5ff; border-left: 4px solid #8b5cf6; padding: 20px; border-radius: 8px; }
    .btn-print { background: #7c3aed; color: #ffffff; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; cursor: pointer; float: right; }
    @media print { .btn-print { display: none; } }
</style>
</head>
<body>
    <div class="container">
        <button onclick="window.print()" class="btn-print">🖨️ Imprimir / Salvar PDF</button>
        <div class="header">
            <h1>🤖 ${reportTitle}</h1>
            <div class="meta">Data da Análise: ${dateStr} | Gerado via ZapVoice IA</div>
        </div>
        <div class="content">${aiReportData.raw_report}</div>
    </div>
</body>
</html>
        `.trim();

        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `relatorio_duvidas_ia_${new Date().getTime()}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    };

    return {
        editingNoteId,
        setEditingNoteId,
        editingNoteText,
        setEditingNoteText,
        isSavingNoteMsg,
        isNoteModalMaximized,
        setIsNoteModalMaximized,
        deleteNoteConfirmMsgId,
        setDeleteNoteConfirmMsgId,
        isDeletingNoteMsg,
        handleSaveEditedNote,
        handleDeleteNoteMsg,
        isOpenAiConfigured,
        isAnalyzingAi,
        aiReportData,
        isAiReportModalOpen,
        setIsAiReportModalOpen,
        handleAnalyzeSingleChatDoubts,
        handleAnalyzeBulkChatsDoubts,
        exportAiReportHtml
    };
}
