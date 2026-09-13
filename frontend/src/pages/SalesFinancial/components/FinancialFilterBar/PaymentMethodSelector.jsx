import React from 'react';
import { PAYMENT_METHOD_OPTIONS } from './filterOptions';

export default function PaymentMethodSelector({
  paymentMethod,
  setPaymentMethod,
  onResetTxPage,
}) {
  return (
    <div className="flex gap-2 flex-wrap items-center">
      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Forma de Pagto:</span>
      {PAYMENT_METHOD_OPTIONS.map(opt => (
        <button
          key={opt.value}
          onClick={() => {
            setPaymentMethod(opt.value);
            if (onResetTxPage) onResetTxPage();
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            paymentMethod === opt.value
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
      <div className="ml-auto flex items-center gap-2 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Brasília (GMT-3)
        </span>
      </div>
    </div>
  );
}
