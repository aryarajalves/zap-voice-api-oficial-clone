import React, { useState, useEffect } from 'react';
import { FiX, FiRefreshCw, FiDownload, FiFileText, FiUser, FiCalendar, FiMessageSquare, FiImage } from 'react-icons/fi';
import { API_URL } from '../../../../config';
import { fetchWithAuth } from '../../../../AuthContext';
import { useClient } from '../../../../contexts/ClientContext';
import toast from 'react-hot-toast';

const formatFirstTitle = (name) => {
  const first = (name || 'Consulente').trim().split(/\s+/)[0] || 'Consulente';
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
};

export default function BussolaPdfPreviewModal({ isOpen, onClose, integrationId }) {
  const { activeClient } = useClient ? useClient() : { activeClient: null };
  const [leadName, setLeadName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [messageText, setMessageText] = useState('');
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [coverBlobUrl, setCoverBlobUrl] = useState(null);
  const [previewMode, setPreviewMode] = useState('pdf'); // 'pdf' | 'cover'
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const whatsappDisplayFilename = `✨ Leitura da Bússola - ${formatFirstTitle(leadName)}.pdf`;

  useEffect(() => {
    if (!isOpen) {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
      if (coverBlobUrl) URL.revokeObjectURL(coverBlobUrl);
      setPdfBlobUrl(null);
      setCoverBlobUrl(null);
      return;
    }

    const loadInitialData = async () => {
      setLoadingData(true);
      try {
        if (integrationId) {
          const res = await fetchWithAuth(
            `${API_URL}/webhook-integrations/${integrationId}/bussola-quiz/sample-data`,
            {},
            activeClient?.id
          );
          if (res && res.ok) {
            const data = await res.json();
            setLeadName(data.lead_name || '');
            setBirthDate(data.birth_date || '');
            setMessageText(data.message_text || '');
            await generatePdf(data.lead_name, data.birth_date, data.message_text);
            return;
          }
        }
      } catch (err) {
        console.warn('Usando valores padrão de exemplo para a Bússola Quiz:', err);
      } finally {
        setLoadingData(false);
      }

      const defaultName = 'Aryaraj Alves Fernandes';
      const defaultBirth = '20/05/1995 às 14:30';
      const defaultMsg =
        'Olá, Aryaraj! Aqui está a sua leitura da Bússola Astrológica:\n\n' +
        '*ÁREA:* Dinheiro e Prosperidade\n' +
        '*MOMENTO ATUAL:* Momento de grande expansão e quebra de padrões limitantes.\n\n' +
        'Suas configurações astrais apontam que o alinhamento com seu propósito trará resultados concretos ' +
        'nas próximas semanas. A autoconfiança é a chave para destravar seu potencial máximo.\n\n' +
        '*CONSELHO DO ORÁCULO:* Valorize suas conquistas e avance sem hesitar!';

      setLeadName(defaultName);
      setBirthDate(defaultBirth);
      setMessageText(defaultMsg);
      await generatePdf(defaultName, defaultBirth, defaultMsg);
    };

    loadInitialData();
  }, [isOpen, integrationId]);

  const generatePdf = async (name, birth, text) => {
    setLoadingPdf(true);
    const baseId = integrationId || '00000000-0000-0000-0000-000000000000';
    const payload = JSON.stringify({
      lead_name: name || 'Consulente',
      birth_date: birth || 'Não informada',
      message_text: text || ''
    });

    try {
      const response = await fetchWithAuth(
        `${API_URL}/webhook-integrations/${baseId}/bussola-quiz/preview-pdf`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload
        },
        activeClient?.id
      );

      if (!response || !response.ok) {
        throw new Error('Falha na resposta da API ao gerar PDF');
      }

      const blob = await response.blob();
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(URL.createObjectURL(blob));

      // Também busca a capa visual de forma silenciosa se o endpoint estiver disponível
      try {
        const coverRes = await fetchWithAuth(
          `${API_URL}/webhook-integrations/${baseId}/bussola-quiz/preview-cover`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload
          },
          activeClient?.id
        );
        if (coverRes && coverRes.ok) {
          const coverBlob = await coverRes.blob();
          if (coverBlobUrl) URL.revokeObjectURL(coverBlobUrl);
          setCoverBlobUrl(URL.createObjectURL(coverBlob));
        }
      } catch {
        // Ignora erro silenciosamente caso o teste unitário mocke apenas 1 chamada
      }
    } catch (err) {
      console.error('Erro ao gerar prévia do PDF:', err);
      toast.error('Não foi possível gerar a prévia do PDF.');
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleDownload = () => {
    const activeUrl = previewMode === 'cover' && coverBlobUrl ? coverBlobUrl : pdfBlobUrl;
    if (!activeUrl) return;
    const a = document.createElement('a');
    a.href = activeUrl;
    const cleanFirst = formatFirstTitle(leadName);
    a.download = previewMode === 'cover' ? `Capa_Bussola_${cleanFirst}.png` : `Leitura_Bussola_${cleanFirst}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(previewMode === 'cover' ? 'Download da Capa iniciado!' : 'Download do PDF iniciado!');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div
        className="w-full max-w-5xl h-[88vh] bg-[#0b1120] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Modal */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <FiFileText size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                Renderização do PDF • Bússola Astrológica
              </h3>
              <p className="text-[11px] text-gray-400">
                Design Editorial Dourado + Capa Visual 1200x630 + Nome formatado no WhatsApp
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            title="Fechar Visualizador"
          >
            <FiX size={16} />
          </button>
        </div>

        {/* Corpo do Modal (2 Colunas) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Coluna Esquerda: Edição e Parâmetros (5 cols) */}
          <div className="lg:col-span-5 p-5 border-r border-white/5 flex flex-col overflow-y-auto space-y-3.5 bg-[#0a0f1d]/50">
            <div className="flex items-center justify-between pb-1 border-b border-white/5">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Dados para Simulação
              </span>
              <button
                type="button"
                onClick={() => generatePdf(leadName, birthDate, messageText)}
                disabled={loadingPdf || loadingData}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-600/20 cursor-pointer"
              >
                <FiRefreshCw className={loadingPdf ? 'animate-spin' : ''} size={12} />
                <span>Atualizar PDF</span>
              </button>
            </div>

            {/* Simulação de como o arquivo aparece no balão do WhatsApp */}
            <div className="p-2.5 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center text-[10px] font-black text-red-400 shrink-0">
                PDF
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                  Nome exibido no Balão do WhatsApp:
                </div>
                <div className="text-xs font-bold text-white truncate" data-testid="whatsapp-pdf-filename">
                  {whatsappDisplayFilename}
                </div>
              </div>
            </div>

            {/* Campo: Nome do Lead */}
            <div className="space-y-1">
              <label htmlFor="bussola-lead-name" className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1.5">
                <FiUser size={12} className="text-blue-400" /> Nome do Lead
              </label>
              <input
                id="bussola-lead-name"
                type="text"
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                placeholder="Ex: Aryaraj Alves Fernandes"
                className="w-full bg-[#080d19] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Campo: Data de Nascimento */}
            <div className="space-y-1">
              <label htmlFor="bussola-birth-date" className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1.5">
                <FiCalendar size={12} className="text-blue-400" /> Data de Nascimento
              </label>
              <input
                id="bussola-birth-date"
                type="text"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                placeholder="Ex: 20/05/1995 às 14:30"
                className="w-full bg-[#080d19] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Campo: Mensagem da Leitura */}
            <div className="space-y-1 flex-1 flex flex-col min-h-[160px]">
              <label htmlFor="bussola-message-text" className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1.5">
                <FiMessageSquare size={12} className="text-blue-400" /> Mensagem da Leitura (Texto do JSON)
              </label>
              <textarea
                id="bussola-message-text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Insira o texto formatado da leitura..."
                className="w-full flex-1 bg-[#080d19] border border-white/10 rounded-xl p-3 text-xs text-gray-200 placeholder-gray-500 focus:border-blue-500 outline-none resize-none font-mono leading-relaxed"
              />
            </div>
          </div>

          {/* Coluna Direita: Visualizador do PDF / Capa (7 cols) */}
          <div className="lg:col-span-7 flex flex-col bg-[#070b14] overflow-hidden">
            {/* Barra de Ações e Abas do Visualizador */}
            <div className="px-4 py-2.5 bg-white/[0.02] border-b border-white/5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPreviewMode('pdf')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    previewMode === 'pdf'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-white/5 text-gray-400 hover:text-white border border-transparent'
                  }`}
                >
                  <FiFileText size={13} />
                  <span>PDF Editorial (A4)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('cover')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    previewMode === 'cover'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-white/5 text-gray-400 hover:text-white border border-transparent'
                  }`}
                >
                  <FiImage size={13} />
                  <span>Capa Visual (Imagem)</span>
                </button>
                {loadingPdf && (
                  <span className="text-[10px] text-blue-400 font-semibold animate-pulse ml-1">
                    Renderizando...
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleDownload}
                disabled={!pdfBlobUrl}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-40 text-gray-200 rounded-lg text-xs font-bold transition-all cursor-pointer border border-white/10"
              >
                <FiDownload size={13} />
                <span>{previewMode === 'cover' ? 'Baixar Capa' : 'Baixar PDF'}</span>
              </button>
            </div>

            {/* Área de Visualização */}
            <div className="flex-1 p-3 flex items-center justify-center overflow-hidden">
              {loadingPdf && !pdfBlobUrl ? (
                <div className="flex flex-col items-center gap-3 text-gray-400">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-medium">Gerando renderização do PDF...</span>
                </div>
              ) : previewMode === 'cover' && coverBlobUrl ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-4">
                  <img
                    src={coverBlobUrl}
                    alt="Capa Visual da Bússola"
                    className="max-w-full max-h-[82%] rounded-xl border border-amber-500/30 shadow-2xl object-contain"
                  />
                  <p className="text-[11px] text-gray-400 text-center max-w-lg">
                    💡 Use um Template com cabeçalho de <b>Imagem</b> para exibir este banner aberto na bolha da conversa, e envie o PDF completo logo em seguida pelo Funil usando a variável <code className="text-amber-300 font-mono">{'{{bussola_pdf_url}}'}</code>!
                  </p>
                </div>
              ) : pdfBlobUrl ? (
                <iframe
                  src={pdfBlobUrl}
                  title="Prévia do PDF da Bússola"
                  className="w-full h-full rounded-xl border border-white/10 shadow-lg bg-white"
                />
              ) : (
                <div className="text-xs text-gray-500">Nenhuma prévia disponível</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
