export const EVENT_HINTS = {
  compra_aprovada: '✅ Disparado no momento em que o pagamento é confirmado pela plataforma. É o evento mais usado — ideal para enviar boas-vindas, acesso ao produto e próximos passos imediatamente após a compra.',
  compra_concluida: '⏳ Disparado quando o prazo de garantia encerra e o cliente não pediu reembolso — ou seja, a venda é definitiva. Útil para enviar bônus ou conteúdo exclusivo após a garantia. Atenção: não confundir com "Compra Aprovada", que dispara no momento do pagamento.',
  compra_aprovada_upsell: '🔀 Disparado quando a compra é identificada como Upsell com base nos produtos configurados na aba "Upsell" desta integração.',
  compra_aprovada_ob: '📦 Disparado quando o produto vendido é ele próprio um Order Bump (produto adicional comprado junto à oferta principal).',
  compra_aprovada_com_ob: '📦 Disparado quando a compra principal veio acompanhada de um ou mais Order Bumps.',
  checkout_pre_populado: '🛒 Disparado quando o lead acessa o checkout pré-populado ou abandona o carrinho com dados já preenchidos (PURCHASE_OUT_OF_SHOPPING_CART).',
  voto_enquete: '📊 Disparado pelo ZapGroup quando um participante vota em uma enquete do grupo. Extrai {{titulo_enquete}} e {{opcao_marcada}}.',
  lead_extraido: '👥 Disparado pelo ZapGroup quando um participante é extraído do grupo do WhatsApp.',
  leitura_concluida: '🔮 Disparado pelo Quiz da Bússola quando a leitura astrológica é concluída. Extrai {{mensagem}}, {{nascimento_data}}, {{cidade}}, {{quiz_area}} e dados da carta.',
  alteracao_vencimento: '📅 Disparado pela Hotmart quando a data de cobrança de uma assinatura é alterada (evento UPDATE_SUBSCRIPTION_CHARGE_DATE).',
  troca_de_plano: '🔄 Disparado pela Hotmart quando o assinante muda de plano (evento SWITCH_PLAN).',
};
