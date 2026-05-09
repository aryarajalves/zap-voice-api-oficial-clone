// Constantes e Helpers para a página de Integrações

export const EVENT_TYPES = [
  { value: 'pix_gerado', label: 'Pix Gerado / Boleto' },
  { value: 'pix_expirado', label: 'Pix Expirado' },
  { value: 'compra_aprovada', label: 'Compra Aprovada' },
  { value: 'carrinho_abandonado', label: 'Carrinho Abandonado' },
  { value: 'cartao_recusado', label: 'Cartão Recusado' },
  { value: 'form_submission', label: 'Formulário / Elementor' },
  { value: 'outros', label: 'Qualquer / Outro' }
];

export const HEADER_VAR_OPTIONS = [
  { value: 'checkout_url', label: 'URL do Checkout (Dinâmico)' },
  { value: 'pix_qrcode', label: 'QR Code Pix (Dinâmico)' },
  { value: 'product_image', label: 'Imagem do Produto (Dinâmico)' },
  { value: 'custom', label: 'URL Estática / Outro Campo' },
];

export const BODY_VAR_OPTIONS = [
  { value: 'name', label: 'Nome do Contato' },
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
