export const PERIOD_OPTIONS = [
  { value: 'daily', label: 'Por Dia' },
  { value: 'weekly', label: 'Por Semana' },
  { value: 'monthly', label: 'Por Mês' },
  { value: 'yearly', label: 'Por Ano' }
];

export const SOURCE_OPTIONS = [
  { value: 'all', label: 'Todos', icon: '📊' },
  { value: 'bulk', label: 'Disparo em Massa', icon: '📤' },
  { value: 'webhook', label: 'Integração Webhook', icon: '🔗' }
];

export function formatPeriodLabel(period, periodType) {
  if (!period) return '';
  if (periodType === 'daily') {
    const [year, month, day] = period.split('-');
    return `${day}/${month}/${year}`;
  }
  if (periodType === 'weekly') {
    return `Semana ${period.split('-W')[1]} de ${period.split('-W')[0]}`;
  }
  if (periodType === 'monthly') {
    const [year, month] = period.split('-');
    const months = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];
    return `${months[parseInt(month, 10) - 1]} ${year}`;
  }
  return period;
}
