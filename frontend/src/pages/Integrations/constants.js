// Constantes e Helpers para a página de Integrações

export const EVENT_TYPES = [
  { value: 'compra_aprovada', label: 'Compra Aprovada' },
  { value: 'compra_aprovada_ob', label: 'Compra Aprovada (Order Bump)' },
  { value: 'compra_aprovada_com_ob', label: 'Compra Aprovada + Order Bump' },
  { value: 'compra_aprovada_upsell', label: 'Compra Aprovada (Upsell)' },
  { value: 'compra_concluida', label: 'Compra Concluída (Pós-Garantia)' },
  { value: 'cartao_recusado', label: 'Cartão Recusado' },
  { value: 'compra_cancelada', label: 'Compra Cancelada' },
  { value: 'reembolso', label: 'Reembolso' },
  { value: 'chargeback', label: 'Chargeback' },
  { value: 'carrinho_abandonado', label: 'Carrinho Abandonado' },
  { value: 'pix_gerado', label: 'Pix Gerado' },
  { value: 'pix_expirado', label: 'Pix Expirado' },
  { value: 'boleto_impresso', label: 'Boleto Gerado / Impresso' },
  { value: 'boleto_expirado', label: 'Boleto Expirado' },
  { value: 'assinatura_cancelada', label: 'Assinatura Cancelada' },
  { value: 'assinatura_atrasada', label: 'Assinatura Atrasada' },
  { value: 'assinatura_renovada', label: 'Assinatura Renovada' },
  { value: 'assinatura_vencida', label: 'Assinatura Vencida' },
  { value: 'form_submission', label: 'Formulário / Elementor' },
  { value: 'evento_aluno', label: 'Evento de Aluno' },
  { value: 'alteracao_vencimento', label: 'Alteração de Vencimento' },
  { value: 'troca_de_plano', label: 'Troca de Plano' },
  { value: 'outros', label: 'Qualquer / Outro' }
];


export const PLATFORM_EVENT_TYPES = {
  hotmart:   ['compra_aprovada','compra_aprovada_ob','compra_concluida','cartao_recusado','reembolso','chargeback','carrinho_abandonado','pix_gerado','pix_expirado','boleto_impresso','alteracao_vencimento','troca_de_plano','evento_aluno','outros'],
  kiwify:    ['compra_aprovada','compra_aprovada_ob','cartao_recusado','reembolso','chargeback','carrinho_abandonado','pix_gerado','boleto_impresso','assinatura_cancelada','assinatura_atrasada','assinatura_renovada','outros'],
  eduzz:     ['compra_aprovada','cartao_recusado','reembolso','carrinho_abandonado','pix_gerado','boleto_impresso','evento_aluno','outros'],
  ticto:     ['compra_aprovada','compra_aprovada_ob','compra_cancelada','cartao_recusado','reembolso','chargeback','carrinho_abandonado','pix_gerado','boleto_impresso','assinatura_cancelada','assinatura_atrasada','assinatura_vencida','assinatura_renovada','outros'],
  pepper:    ['compra_aprovada','compra_aprovada_com_ob','compra_cancelada','cartao_recusado','reembolso','chargeback','carrinho_abandonado','pix_gerado','boleto_impresso','outros'],
  braip:     ['compra_aprovada','compra_aprovada_com_ob','compra_cancelada','cartao_recusado','reembolso','chargeback','carrinho_abandonado','pix_gerado','boleto_impresso','outros'],
  kirvano:   ['compra_aprovada','compra_aprovada_com_ob','reembolso','pix_gerado','pix_expirado','outros'],
  monetizze: ['compra_aprovada','cartao_recusado','reembolso','chargeback','carrinho_abandonado','pix_gerado','assinatura_cancelada','assinatura_renovada','outros'],
  cakto:     ['compra_aprovada','cartao_recusado','reembolso','chargeback','carrinho_abandonado','pix_gerado','pix_expirado','boleto_impresso','assinatura_cancelada','assinatura_atrasada','assinatura_renovada','outros'],
  guru:      ['compra_aprovada','compra_aprovada_com_ob','compra_aprovada_upsell','compra_cancelada','cartao_recusado','reembolso','chargeback','carrinho_abandonado','pix_gerado','pix_expirado','boleto_impresso','boleto_expirado','assinatura_cancelada','assinatura_atrasada','assinatura_renovada','outros'],
  lastlink:  ['compra_aprovada_upsell','compra_cancelada','compra_concluida','reembolso','chargeback','carrinho_abandonado','pix_gerado','pix_expirado','boleto_impresso','boleto_expirado','assinatura_cancelada','assinatura_atrasada','assinatura_renovada','outros'],
  hubla:     ['compra_aprovada','compra_cancelada','cartao_recusado','reembolso','chargeback','carrinho_abandonado','pix_gerado','pix_expirado','boleto_impresso','boleto_expirado','assinatura_cancelada','assinatura_atrasada','assinatura_renovada','outros'],
  greenn:    ['compra_aprovada','compra_aprovada_com_ob','compra_aprovada_upsell','cartao_recusado','reembolso','chargeback','carrinho_abandonado','pix_gerado','pix_expirado','boleto_impresso','boleto_expirado','assinatura_cancelada','assinatura_atrasada','assinatura_renovada','outros'],
  herospark: ['compra_aprovada','compra_aprovada_com_ob','compra_aprovada_upsell','cartao_recusado','reembolso','chargeback','carrinho_abandonado','pix_gerado','pix_expirado','boleto_expirado','assinatura_cancelada','assinatura_atrasada','assinatura_renovada','outros'],
  pagtrust:  ['compra_aprovada','compra_aprovada_ob','compra_cancelada','cartao_recusado','reembolso','chargeback','carrinho_abandonado','pix_gerado','pix_expirado','boleto_impresso','outros'],
  elementor: ['form_submission','outros'],
  outra:     ['compra_aprovada','cartao_recusado','reembolso','carrinho_abandonado','pix_gerado','boleto_impresso','outros'],
};

export const HEADER_VAR_OPTIONS = [
  { value: 'checkout_url', label: 'URL do Checkout (Dinâmico)' },
  { value: 'pix_qrcode', label: 'QR Code Pix (Dinâmico)' },
  { value: 'product_image', label: 'Imagem do Produto (Dinâmico)' },
  { value: 'custom', label: 'URL Estática / Outro Campo' },
];

export const BODY_VAR_OPTIONS = [
  { value: 'name', label: 'Nome do Contato' },
  { value: 'first_name', label: 'Primeiro Nome do Contato' },
  { value: 'phone', label: 'Telefone' },
  { value: 'email', label: 'E-mail' },
  { value: 'product_name', label: 'Nome do Produto' },
  { value: 'price', label: 'Valor da Compra (R$)' },
  { value: 'payment_method', label: 'Método de Pagamento' },
  { value: 'status', label: 'Status do Pedido (Ex: Abandoned)' },
  { value: 'checkout_url', label: 'URL do Checkout / Boleto / Pix' },
  { value: 'pix_qrcode', label: 'QR Code Pix (Copia e Cola)' },
  { value: 'buyer.name', label: '[Hotmart] Nome Completo' },
  { value: 'Customer.full_name', label: '[Kiwify] Nome Completo' },
  { value: 'custom', label: 'Campo Personalizado / Fixo' },
];

// Helper para normalizar chatwoot_label para sempre ser um array limpo de strings simples.
export const normalizeChatwootLabel = (value, depth = 0) => {
  if (depth > 10) return []; // prevent infinite recursion
  if (!value) return [];

  // Se for um array, processa cada elemento
  if (Array.isArray(value)) {
    const result = [];
    for (const item of value) {
      const normalized = normalizeChatwootLabel(item, depth + 1);
      result.push(...normalized);
    }
    // Filtra apenas strings simples (sem JSON chars), deduplica
    return [...new Set(result.filter(v => v && typeof v === 'string' && !v.startsWith('[') && !v.startsWith('{') && !v.startsWith('"')))];
  }

  // Se for uma string, tenta desempacotar
  if (typeof value === 'string') {
    const trimmed = value.trim();

    // Tenta fazer JSON.parse se parecido com JSON
    if (trimmed.startsWith('[') || trimmed.startsWith('"')) {
      try {
        const parsed = JSON.parse(trimmed);
        return normalizeChatwootLabel(parsed, depth + 1);
      } catch {
        // Se falhou, tenta remover artefatos e usar como string simples
        const cleaned = trimmed.replace(/^\[|\]$/g, '').replace(/^"|"$/g, '').trim();
        if (cleaned && !cleaned.startsWith('[')) return [cleaned];
        return [];
      }
    }

    // String simples, retorna diretamente
    if (trimmed) return [trimmed];
  }

  return [];
};

export const findPathInObject = (obj, targetKey, currentPath = "") => {
  if (!obj || typeof obj !== 'object') return null;
  for (const key in obj) {
    const newPath = currentPath ? `${currentPath}.${key}` : key;
    if (key === targetKey) return newPath;
    if (typeof obj[key] === 'object') {
      const found = findPathInObject(obj[key], targetKey, newPath);
      if (found) return found;
    }
  }
  return null;
};
