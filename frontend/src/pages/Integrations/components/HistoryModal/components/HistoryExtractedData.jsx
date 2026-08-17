import React from 'react';
import { FiZap, FiSettings, FiCheckCircle } from 'react-icons/fi';
import { COUNTRY_INFO } from '../utils/HistoryHelpers';
import { EVENT_TYPES } from '../../../constants';
import HistoryManyChatStatus from './HistoryManyChatStatus';

const METHOD_TRANSLATIONS = {
  'credit_card': 'Cartão de Crédito',
  'credit_cards': 'Cartão de Crédito',
  'billet': 'Boleto',
  'boleto': 'Boleto',
  'pix': 'Pix',
  'bank_slip': 'Boleto',
  'bank_transfer': 'Transferência',
  'debit_card': 'Cartão de Débito',
  'paypal': 'PayPal',
  'free': 'Gratuito',
  'bankslip': 'Boleto',
  'hybrid': 'Híbrido'
};

export default function HistoryExtractedData({
  item,
  integration
}) {
  const processed = item.processed_data || {};
  const customMapping = integration?.custom_fields_mapping || {};

  const validCustomFieldEntries = Object.entries(processed?.custom_fields || {})
    .filter(([k]) => !k.toLowerCase().startsWith('id ') && k !== 'Status Assinatura');

  return (
    <>
      {/* Banner Order Bump */}
      {(item.event_type === 'compra_aprovada_ob' || processed?.order_bump) && (
        <div className="mb-4 relative z-10 rounded-xl overflow-hidden border border-orange-500/30 bg-orange-500/5">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-500/10">
            <FiZap size={13} className="text-orange-400 shrink-0" fill="currentColor" />
            <span className="text-orange-400 font-black uppercase tracking-widest text-[10px]">Este produto é um Order Bump</span>
          </div>
          <div className="px-4 py-2.5 text-[11px] text-orange-300/80">
            O produto listado abaixo foi vendido como Order Bump — produto adicional comprado junto à oferta principal.
          </div>
        </div>
      )}

      {(item.event_type === 'compra_aprovada_com_ob' || (!processed?.order_bump && processed?.order_bump_products?.length > 0)) && (
        <div className="mb-4 relative z-10 rounded-xl overflow-hidden border border-orange-500/30 bg-orange-500/5">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-500/10 border-b border-orange-500/20">
            <FiZap size={13} className="text-orange-400 shrink-0" fill="currentColor" />
            <span className="text-orange-400 font-black uppercase tracking-widest text-[10px]">Order Bump incluído — produto adicional adquirido</span>
          </div>
          {processed?.order_bump_products?.length > 0 ? (
            <div className="px-4 py-3 space-y-1.5">
              {processed.order_bump_products.map((ob, idx) => (
                <div key={idx} className="flex items-center justify-between text-[11px]">
                  <span className="text-orange-200 font-bold">{ob.name || ob.product_name || `Produto OB ${idx + 1}`}</span>
                  {ob.price && <span className="text-orange-400 font-black">R$ {ob.price}</span>}
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-2.5 text-[11px] text-orange-300/70 italic">
              Produtos do Order Bump não detalhados neste registro.
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-[12px] relative z-10">
        <div className="flex justify-between border-b border-blue-200/30 dark:border-blue-700/20 pb-1.5">
          <span className="text-gray-400 dark:text-gray-400 font-medium">Plataforma:</span>
          <span className="font-bold text-blue-400 dark:text-blue-400 capitalize">{processed.platform || '-'}</span>
        </div>

        <div className="flex justify-between border-b border-blue-200/30 dark:border-blue-700/20 pb-1.5">
          <span className="text-gray-400 dark:text-gray-400 font-medium flex items-center gap-1.5">
            Nome:
            {customMapping.name && (
              <span className="text-[9px] font-mono bg-blue-500/10 text-blue-400 px-1 py-0.5 rounded border border-blue-500/10 normal-case" title="Chave JSON mapeada">
                {customMapping.name}
              </span>
            )}
          </span>
          <span className="font-bold text-white dark:text-white">{processed.name || '-'}</span>
        </div>

        <div className="flex justify-between border-b border-blue-200/30 dark:border-blue-700/20 pb-1.5">
          <span className="text-gray-500 dark:text-gray-500 font-medium flex items-center gap-1.5">
            Telefone:
            {customMapping.phone && (
              <span className="text-[9px] font-mono bg-blue-500/10 text-blue-400 px-1 py-0.5 rounded border border-blue-500/10 normal-case" title="Chave JSON mapeada">
                {customMapping.phone}
              </span>
            )}
          </span>
          <span className="font-bold text-gray-800 dark:text-gray-200 tracking-tight">{processed.phone || '-'}</span>
        </div>

        <div className="flex justify-between border-b border-blue-200/30 dark:border-blue-700/20 pb-1.5">
          <span className="text-gray-500 dark:text-gray-500 font-medium flex items-center gap-1.5">
            E-mail:
            {customMapping.email && (
              <span className="text-[9px] font-mono bg-blue-500/10 text-blue-400 px-1 py-0.5 rounded border border-blue-500/10 normal-case" title="Chave JSON mapeada">
                {customMapping.email}
              </span>
            )}
          </span>
          <span className="font-bold text-gray-800 dark:text-gray-200 lowercase">{processed.email || '-'}</span>
        </div>

        {processed?.custom_fields?.CPF && (
          <div className="flex justify-between border-b border-blue-200/30 dark:border-blue-700/20 pb-1.5">
            <span className="text-gray-400 dark:text-gray-400 font-medium">CPF:</span>
            <span className="font-bold text-gray-800 dark:text-gray-200">{processed.custom_fields.CPF}</span>
          </div>
        )}
        {processed?.custom_fields?.CNPJ && (
          <div className="flex justify-between border-b border-blue-200/30 dark:border-blue-700/20 pb-1.5">
            <span className="text-gray-400 dark:text-gray-400 font-medium">CNPJ:</span>
            <span className="font-bold text-gray-800 dark:text-gray-200">{processed.custom_fields.CNPJ}</span>
          </div>
        )}
        {processed?.custom_fields?.Documento && (
          <div className="flex justify-between border-b border-blue-200/30 dark:border-blue-700/20 pb-1.5">
            <span className="text-gray-400 dark:text-gray-400 font-medium">Documento:</span>
            <span className="font-bold text-gray-800 dark:text-gray-200">{processed.custom_fields.Documento}</span>
          </div>
        )}

        <div className="flex justify-between border-b border-blue-200/30 dark:border-blue-700/20 pb-1.5 md:col-span-2">
          <span className="text-gray-400 dark:text-gray-400 font-medium whitespace-nowrap flex items-center gap-1.5">
            Produtos:
            {customMapping.product_name && (
              <span className="text-[9px] font-mono bg-blue-500/10 text-blue-400 px-1 py-0.5 rounded border border-blue-500/10 normal-case animate-fade-in" title="Chave JSON mapeada">
                {customMapping.product_name}
              </span>
            )}
          </span>
          <div className="flex flex-col items-end gap-1.5 w-full pl-8">
            {processed.items && processed.items.length > 0 ? (
              processed.items.map((prod, idx) => (
                <div key={idx} className="flex justify-between w-full text-[11px] bg-blue-500/5 px-2 py-1 rounded border border-blue-500/10">
                  <span className="text-gray-300 truncate mr-2">{prod.name}</span>
                  <span className="text-blue-400 font-bold whitespace-nowrap">R$ {prod.price || '0'}</span>
                </div>
              ))
            ) : (
              <span className="font-bold text-blue-400 text-right">{processed.product_name || '-'}</span>
            )}
          </div>
        </div>

        {processed.e_order_bump && (
          <div className="flex justify-between border-b border-orange-200/30 dark:border-orange-700/20 pb-1.5 md:col-span-2 bg-orange-500/5 px-2 rounded-sm">
            <span className="text-orange-600 dark:text-orange-400 font-bold flex items-center gap-1.5">
              <FiZap size={12} /> Order Bump Detectado!
            </span>
            <span className="font-medium text-orange-500 text-[10px] uppercase tracking-tighter self-center">Venda Casada</span>
          </div>
        )}

        {processed?.items_detailed && (
          <div className="flex flex-col gap-1.5 md:col-span-2 bg-gray-50 dark:bg-[#0b1120]/50 p-3 rounded-lg border border-gray-100 dark:border-white/5 mt-1">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-widest mb-1">Itens do Pedido</span>
            {processed.items_detailed.map((prod, idx) => (
              <div key={idx} className="flex justify-between items-center text-[11px] pb-1 border-b border-gray-100 dark:border-gray-800 last:border-0 last:pb-0">
                <span className="text-gray-700 dark:text-gray-300 font-medium">
                  {typeof prod === 'object' ? (prod.name || 'Produto') : (String(prod).split(' - ')[0] || 'Produto')}
                </span>
                <span className="text-blue-500 dark:text-blue-400 font-bold ml-4">
                  {typeof prod === 'object' ? (prod.price || '0') : (String(prod).split(' - ')[1] || '0')}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between border-b border-blue-200/30 dark:border-blue-700/20 pb-1.5">
          <span className="text-gray-400 dark:text-gray-400 font-medium flex items-center gap-1.5">
            Método:
            {customMapping.payment_method && (
              <span className="text-[9px] font-mono bg-blue-500/10 text-blue-400 px-1 py-0.5 rounded border border-blue-500/10 normal-case" title="Chave JSON mapeada">
                {customMapping.payment_method}
              </span>
            )}
          </span>
          <span className="font-bold text-white dark:text-white capitalize">
            {METHOD_TRANSLATIONS[String(processed.payment_method || '').toLowerCase()] || processed.payment_method || '-'}
          </span>
        </div>

        <div className="flex justify-between border-b border-blue-200/30 dark:border-blue-700/20 pb-1.5">
          <span className="text-gray-400 dark:text-gray-400 font-medium flex items-center gap-1.5">
            Valor:
            {customMapping.price && (
              <span className="text-[9px] font-mono bg-blue-500/10 text-blue-400 px-1 py-0.5 rounded border border-blue-500/10 normal-case" title="Chave JSON mapeada">
                {customMapping.price}
              </span>
            )}
          </span>
          <span className="font-bold text-green-400 dark:text-green-400">
            {processed.price ? `R$ ${processed.price}` : 'R$ -'}
          </span>
        </div>

        {processed.country && (
          <div className="flex justify-between border-b border-blue-200/30 dark:border-blue-700/20 pb-1.5 md:col-span-2">
            <span className="text-gray-400 dark:text-gray-400 font-medium">País de Origem:</span>
            <span className="font-bold text-white dark:text-white flex items-center gap-2">
              {(() => {
                const iso = String(processed.country).toUpperCase();
                const info = COUNTRY_INFO[iso];
                return info
                  ? <><span className="text-lg leading-none">{info.flag}</span><span>{info.name}</span><span className="text-gray-500 text-[10px] font-mono">({iso})</span></>
                  : <span>{iso}</span>;
              })()}
            </span>
          </div>
        )}

        <div className="flex justify-between border-b border-blue-200/30 dark:border-blue-700/20 pb-1.5 md:col-span-2">
          <span className="text-gray-400 dark:text-gray-400 font-medium whitespace-nowrap">Status Principal:</span>
          {(() => {
            const eventLabel = EVENT_TYPES.find(e => e.value === item.event_type)?.label || item.event_type || '-';
            const isApproved = item.event_type?.includes('compra_aprovada');
            const isChargeback = item.event_type === 'chargeback';
            const isNegative = item.event_type?.includes('expirado') || item.event_type?.includes('cancelad') || item.event_type?.includes('recusado') || item.event_type?.includes('reembolso');
            const colorClass = isChargeback ? 'text-red-500 bg-red-500/10' : isApproved ? 'text-green-500 bg-green-500/10' : isNegative ? 'text-orange-500 bg-orange-500/10' : 'text-blue-500 bg-blue-500/10';
            return (
              <span className={`font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${colorClass}`}>
                {eventLabel}
              </span>
            );
          })()}
        </div>

        <div className="flex justify-between border-b border-blue-200/30 dark:border-blue-700/20 pb-1.5 md:col-span-2">
          <span className="text-gray-400 dark:text-gray-400 font-medium whitespace-nowrap">Etiquetas Internas (ZapVoice):</span>
          {processed.internal_tags ? (
            <div className="flex flex-wrap gap-1 justify-end">
              {processed.internal_tags.split(',').map(tag => tag.trim()).filter(Boolean).map(tag => (
                <span key={tag} className="bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-md text-[10px] font-black border border-blue-500/20">
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <span className="font-bold text-gray-400 dark:text-gray-400">-</span>
          )}
        </div>

        {/* Status ManyChat */}
        {processed?.manychat_enabled && (
          <div className="md:col-span-2">
            <HistoryManyChatStatus manychat_sync={processed.manychat_sync} />
          </div>
        )}

        {/* Integração Aba Contatos / Chatwoot */}
        {(processed?.private_note_enabled || (processed?.chatwoot_label && (Array.isArray(processed.chatwoot_label) ? processed.chatwoot_label.length > 0 : String(processed.chatwoot_label).length > 0)) || (processed?.free_message_enabled && (item.template_name || item.funnel_id))) && (
          <div className="mt-4 p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl relative overflow-hidden group/cw md:col-span-2">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none group-hover/cw:scale-110 transition-transform duration-700">
              <FiSettings size={60} className="text-blue-400" />
            </div>
            <div className="text-[10px] text-blue-400 font-black uppercase mb-3 flex items-center justify-between tracking-widest relative z-10">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-blue-500"></span>
                Integração na Aba de Contatos (ZapVoice)
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-[11px] relative z-10">
              {processed.private_note_enabled && (
                <div className="flex justify-between items-center border-b border-blue-500/10 pb-1">
                  <span className="text-gray-400">Nota Privada:</span>
                  <span className="font-bold text-green-400 flex items-center gap-1">
                    <FiCheckCircle size={10} /> Ativa
                  </span>
                </div>
              )}
              {processed.free_message_enabled && (
                <div className="flex justify-between items-center border-b border-blue-500/10 pb-1">
                  <span className="text-gray-400">Mensagem Livre:</span>
                  <span className="font-bold text-indigo-400">Sessão Ativa</span>
                </div>
              )}
              {(processed.chatwoot_label && (Array.isArray(processed.chatwoot_label) ? processed.chatwoot_label.length > 0 : String(processed.chatwoot_label).length > 0)) && (
                <div className="md:col-span-2 pt-1">
                  <span className="text-gray-500 block mb-1.5 uppercase text-[9px] font-black tracking-widest opacity-60">Etiquetas Aplicadas:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(() => {
                      let labels = [];
                      const raw = processed.chatwoot_label;
                      if (Array.isArray(raw)) {
                        labels = raw;
                      } else if (typeof raw === 'string') {
                        let clean = raw.trim();
                        if (clean.startsWith('[') && clean.endsWith(']')) {
                          clean = clean.substring(1, clean.length - 1);
                        }
                        labels = clean.split(',').map(l => l.replace(/["']/g, '').trim()).filter(Boolean);
                      }
                      return labels.map((label, i) => (
                        <span key={i} className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-lg text-[10px] font-black">
                          {label}
                        </span>
                      ));
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Campos Extras */}
        {validCustomFieldEntries.length > 0 && (
          <div className="mt-2 md:col-span-2 bg-purple-500/5 border border-purple-500/10 p-3 rounded-xl relative overflow-hidden">
            <div className="text-[10px] text-purple-600 dark:text-purple-400 font-black uppercase mb-3 flex items-center gap-1.5 tracking-widest relative z-10">
              <FiSettings size={12} />
              Campos Personalizados (Extras)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 relative z-10 text-[11px]">
              {validCustomFieldEntries.map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-purple-200/20 dark:border-purple-700/20 pb-1 break-all">
                  <span className="text-gray-500 dark:text-gray-400 font-medium pr-2 max-w-[50%] truncate shrink-0" title={k}>{k}:</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200 text-right shrink min-w-0" title={v}>{String(v) || '-'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {processed.utm_source && (
          <div className="flex justify-between border-b border-blue-200/30 dark:border-blue-700/20 pb-1.5 md:col-span-2">
            <span className="text-gray-500 dark:text-gray-500 font-medium">Origem (UTM):</span>
            <span className="font-bold text-indigo-500 dark:text-indigo-400">
              {processed.utm_source} {processed.utm_medium ? `(${processed.utm_medium})` : ''}
            </span>
          </div>
        )}
      </div>
    </>
  );
}
