import React from 'react';
import { FiLink, FiPhone, FiMessageSquare } from 'react-icons/fi';

// Extrai o primeiro nome de uma string
export const getFirstName = (name) => name ? name.trim().split(' ')[0] : '';

// Retorna estilo e label para tipo de botão do WhatsApp
export const getButtonInfo = (btn) => {
  const t = (btn.type || '').toUpperCase();
  if (t === 'QUICK_REPLY') return {
    color: 'text-green-400',
    bg: 'bg-green-500/10 border-green-500/30',
    icon: <FiMessageSquare size={11} />,
    label: 'Resposta Rápida',
    configurable: true
  };
  if (t === 'URL') return {
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/30',
    icon: <FiLink size={11} />,
    label: `Link: ${btn.url || ''}`,
    configurable: false
  };
  if (t === 'PHONE_NUMBER') return {
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10 border-yellow-500/30',
    icon: <FiPhone size={11} />,
    label: `Telefone: ${btn.phone_number || ''}`,
    configurable: false
  };
  return {
    color: 'text-gray-400',
    bg: 'bg-white/5 border-white/10',
    icon: null,
    label: t,
    configurable: false
  };
};
