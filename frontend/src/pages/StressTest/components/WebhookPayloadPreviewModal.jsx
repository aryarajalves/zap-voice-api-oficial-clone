import React from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiEye } from 'react-icons/fi';
import { generateWebhookPayload } from '../hooks/useStressTest';

const METHOD_PT = {
  'CREDIT_CARD': 'Cartão de Crédito', 'credit_card': 'Cartão de Crédito',
  'BILLET': 'Boleto', 'boleto': 'Boleto', 'billet': 'Boleto',
  'PIX': 'Pix', 'pix': 'Pix',
  'BANK_SLIP': 'Boleto', 'bank_slip': 'Boleto', 'DEBIT_CARD': 'Cartão de Débito',
  'PAYPAL': 'PayPal', 'TWO_CREDIT_CARDS': '2 Cartões',
  'Pix': 'Pix', 'Boleto': 'Boleto',
};

const formatPrice = (val) => val != null ? `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null;

export default function WebhookPayloadPreviewModal({ previewEvent, jsonMaximized, setJsonMaximized, onClose }) {
  if (!previewEvent) return null;

  const statusPT = previewEvent.label;
  const p = generateWebhookPayload(previewEvent.platform, previewEvent.eventType, 0);
  const ext = {};

  if (previewEvent.platform === 'hotmart') {
    const d = p.data || {};
    ext.Nome = d.buyer?.name; ext.Email = d.buyer?.email;
    ext.Telefone = d.subscriber?.phone ? `${d.subscriber.phone.dddCell}${d.subscriber.phone.cell}` : null;
    ext.Produto = d.product?.name; ext.Status = statusPT;
    ext['Método'] = METHOD_PT[d.purchase?.payment?.type] || d.purchase?.payment?.type;
    ext['Preço'] = formatPrice(d.purchase?.price?.value);
  } else if (previewEvent.platform === 'greenn') {
    const whType = String(p.type || '').toLowerCase();
    if (whType === 'sale') {
      const client = p.client || {};
      const saleObj = p.sale || {};
      ext.Nome = client.name; ext.Email = client.email;
      ext.Telefone = client.cellphone ? String(client.cellphone).replace(/\D/g, '') : null;
      ext.Produto = p.product?.name; ext.Status = statusPT;
      ext['Método'] = METHOD_PT[saleObj.method] || saleObj.method;
      ext['Preço'] = formatPrice(saleObj.amount);
      if (client.cpf_cnpj) ext['Documento'] = client.cpf_cnpj;
      const obItems = (p.products || []).filter(pr => pr.is_order_bump);
      if (obItems.length > 0) ext['⚡ Order Bump'] = obItems.map(ob => ob.name || 'Produto OB').join(', ');
    } else if (whType === 'contract') {
      const client = p.client || {};
      const currentSale = p.currentSale || {};
      ext.Nome = client.name; ext.Email = client.email;
      ext.Telefone = client.cellphone ? String(client.cellphone).replace(/\D/g, '') : null;
      ext.Produto = p.product?.name; ext.Status = statusPT;
      ext['Método'] = METHOD_PT[currentSale.method] || currentSale.method;
      ext['Preço'] = formatPrice(currentSale.amount || p.product?.amount);
      if (client.cpf_cnpj) ext['Documento'] = client.cpf_cnpj;
    } else if (whType === 'lead') {
      const lead = p.lead || {};
      ext.Nome = lead.name; ext.Email = lead.email;
      ext.Telefone = lead.cellphone ? String(lead.cellphone).replace(/\D/g, '') : null;
      ext.Status = statusPT;
    }
  } else if (previewEvent.platform === 'guru') {
    const whType = String(p.webhook_type || '').toLowerCase();
    if (whType === 'transaction') {
      const contact = p.contact || {};
      const payment = p.payment || {};
      ext.Nome = contact.name; ext.Email = contact.email;
      const localCode = String(contact.phone_local_code || '');
      const phoneNum = String(contact.phone_number || '');
      ext.Telefone = (localCode + phoneNum).replace(/\D/g, '') || null;
      ext.Produto = p.product?.name; ext.Status = statusPT;
      ext['Método'] = METHOD_PT[payment.method] || payment.method;
      ext['Preço'] = formatPrice(payment.total ?? p.product?.total_value);
      if (contact.doc) ext['Documento'] = contact.doc;
    } else if (whType === 'subscription') {
      const subscriber = p.subscriber || {};
      const invoice = p.current_invoice || {};
      ext.Nome = subscriber.name; ext.Email = subscriber.email;
      const localCode = String(subscriber.phone_local_code || '');
      const phoneNum = String(subscriber.phone_number || '');
      ext.Telefone = (localCode + phoneNum).replace(/\D/g, '') || null;
      ext.Produto = p.product?.name; ext.Status = statusPT;
      ext['Método'] = METHOD_PT[p.payment_method] || p.payment_method;
      ext['Preço'] = formatPrice(invoice.value);
      if (subscriber.doc) ext['Documento'] = subscriber.doc;
    }
  } else if (previewEvent.platform === 'kirvano') {
    ext.Nome = p.customer?.name; ext.Email = p.customer?.email;
    ext.Telefone = p.customer?.phone_number; ext.Produto = p.products?.[0]?.name || 'Produto Scale Test';
    ext.Status = statusPT; ext['Método'] = METHOD_PT[p.payment?.method] || p.payment?.method;
    ext['Preço'] = p.products?.[0]?.price || null;
  } else if (previewEvent.platform === 'kiwify') {
    ext.Nome = p.Customer?.full_name; ext.Email = p.Customer?.email;
    ext.Telefone = p.Customer?.mobile; ext.Produto = p.Product?.title;
    ext.Status = statusPT; ext['Método'] = METHOD_PT[p.payment_method] || null;
    ext['Preço'] = formatPrice(p.order_total);
  } else if (previewEvent.platform === 'eduzz') {
    if (p.data?.learner) {
      ext.Nome = p.data.learner.name; ext.Email = p.data.learner.email;
      ext.Produto = p.data.course?.title; ext.Status = statusPT;
    } else {
      const d = p.data || {};
      ext.Nome = d.buyer?.name; ext.Email = d.buyer?.email;
      ext.Telefone = d.buyer?.cellphone; ext.Produto = d.items?.[0]?.name;
      ext.Status = statusPT; ext['Método'] = METHOD_PT[d.paymentMethod] || d.paymentMethod;
      ext['Preço'] = formatPrice(d.price?.value ?? d.items?.[0]?.price?.value);
    }
  } else if (previewEvent.platform === 'ticto') {
    const o = p.order || {};
    ext.Nome = o.buyer?.name; ext.Email = o.buyer?.email;
    ext.Telefone = o.buyer?.phone_number; ext.Produto = o.product?.name;
    ext.Status = statusPT; ext['Método'] = METHOD_PT[o.payment_method] || o.payment_method;
    ext['Preço'] = formatPrice(o.total_price);
  } else if (previewEvent.platform === 'pepper') {
    const d = p.data || {};
    ext.Nome = d.customer?.name; ext.Email = d.customer?.email;
    ext.Telefone = d.customer?.phone; ext.Produto = d.product?.name;
    ext.Status = statusPT; ext['Método'] = METHOD_PT[d.transaction?.payment_method] || d.transaction?.payment_method;
    ext['Preço'] = formatPrice(d.transaction?.price);
  } else if (previewEvent.platform === 'braip') {
    ext.Nome = p.contact_name; ext.Email = p.contact_email;
    ext.Telefone = p.contact_phone; ext.Produto = p.product_title;
    ext.Status = statusPT; ext['Método'] = METHOD_PT[p.payment_method] || p.payment_method;
    ext['Preço'] = formatPrice(p.price);
  } else if (previewEvent.platform === 'monetizze') {
    ext.Nome = p.consumer?.name; ext.Email = p.consumer?.email;
    ext.Telefone = p.consumer?.cellphone || p.consumer?.phone;
    ext.Produto = p.product?.name; ext.Status = statusPT;
    ext['Método'] = typeof p.payment_method === 'object' ? p.payment_method?.name : p.payment_method;
    ext['Preço'] = formatPrice(p.product?.price || p.value);
  } else if (previewEvent.platform === 'cakto') {
    const d = p.data || {};
    ext.Nome = d.customer?.name; ext.Email = d.customer?.email;
    ext.Telefone = d.customer?.phone; ext.Produto = d.product?.name;
    ext.Status = statusPT; ext['Método'] = METHOD_PT[d.order?.payment_method] || d.order?.payment_method;
    ext['Preço'] = d.order?.total ? formatPrice(d.order.total) : null;
  } else if (previewEvent.platform === 'pagtrust') {
    ext.Nome = p.buyerVOName || p.customerFullName || p.name;
    ext.Email = p.buyerVOEmail || p.customerEmail || p.email;
    ext.Produto = p.productName || p.prod_name;
    ext.Status = statusPT; ext['Método'] = METHOD_PT[p.payment_type] || p.payment_type;
    ext['Preço'] = p.price ? `R$ ${p.price}` : null;
  } else if (previewEvent.platform === 'herospark') {
    ext.Nome = p.buyer?.name; ext.Email = p.buyer?.email;
    ext.Telefone = p.buyer?.phone ? String(p.buyer.phone).replace(/\D/g, '') : null;
    ext.Produto = p.product?.name; ext.Status = statusPT;
    ext['Método'] = METHOD_PT[p.purchase?.payment?.type] || p.purchase?.payment?.type;
  } else {
    ext.Nome = 'Contato Teste 1'; ext.Email = 'teste.contato1@example.com';
    ext.Status = statusPT;
  }

  const fields = Object.entries(ext).filter(([, v]) => v);
  const jsonStr = JSON.stringify(p, null, 2);
  const highlighted = jsonStr
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g, (m) => {
      if (/^"/.test(m)) {
        if (/:$/.test(m)) return `<span style="color:#79b8ff;font-weight:600">${m}</span>`;
        return `<span style="color:#9ecbff">${m}</span>`;
      }
      if (/true|false|null/.test(m)) return `<span style="color:#f97583">${m}</span>`;
      return `<span style="color:#ffab70">${m}</span>`;
    });

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-[#0e121e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#141927]">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <FiEye size={18} />
            </span>
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                Payload do Webhook — {previewEvent.label}
              </h3>
              <p className="text-xs text-gray-400 font-mono">
                Plataforma: <span className="text-violet-400 uppercase">{previewEvent.platform}</span> · Evento: <span className="text-blue-400">{previewEvent.eventType}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Campos extraídos */}
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              Campos Principais Mapeados
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {fields.map(([k, v]) => (
                <div key={k} className="p-3 bg-white/5 border border-white/5 rounded-xl space-y-0.5">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">{k}</span>
                  <span className="text-xs text-white font-semibold break-all">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* JSON Payload Completo */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Corpo JSON Completo
              </h4>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(jsonStr);
                }}
                className="text-xs text-violet-400 hover:underline"
              >
                Copiar JSON
              </button>
            </div>
            <pre
              className="p-4 bg-[#080b12] border border-white/5 rounded-xl font-mono text-xs text-gray-300 overflow-x-auto leading-relaxed max-h-80"
              dangerouslySetInnerHTML={{ __html: highlighted }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#141927] border-t border-white/10 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition-all"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
