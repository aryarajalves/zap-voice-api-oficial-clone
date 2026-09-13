export const CONTACT_VARIABLES = [
  { code: '{{nome}}', label: 'Nome do Contato', desc: 'Nome completo do lead' },
  { code: '{{email}}', label: 'E-mail do Contato', desc: 'Endereço de e-mail principal' },
  { code: '{{phone}}', label: 'Telefone do Contato', desc: 'Número de telefone / WhatsApp' },
  { code: '{{produto}}', label: 'Nome do Produto', desc: 'Produto comprado pelo lead' },
  { code: '{{plataforma}}', label: 'Plataforma de Origem', desc: 'Ex: Hotmart, Kiwify, Eduzz, etc' },
  { code: '{{valor}}', label: 'Valor da Compra', desc: 'Preço / Valor transacionado' },
];

export const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return dateStr;
  }
};
