/**
 * Calcula date_from e date_to (string YYYY-MM-DD) com base em um preset de período.
 * @param {string} preset - 'custom' | 'last7' | 'last14' | 'last30' | 'this_month' | 'last_month' | 'YYYY-MM' (mês específico)
 * @param {string} customFrom - Usado quando preset === 'custom'
 * @param {string} customTo   - Usado quando preset === 'custom'
 */
export function resolveDateRange(preset, customFrom, customTo) {
  if (!preset || preset === '') return { from: null, to: null };

  const today = new Date();
  const fmt = (d) => d.toISOString().split('T')[0];

  if (preset === 'custom') {
    return { from: customFrom || null, to: customTo || null };
  }

  if (preset === 'last7') {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    return { from: fmt(from), to: fmt(today) };
  }

  if (preset === 'last14') {
    const from = new Date(today);
    from.setDate(from.getDate() - 13);
    return { from: fmt(from), to: fmt(today) };
  }

  if (preset === 'last30') {
    const from = new Date(today);
    from.setDate(from.getDate() - 29);
    return { from: fmt(from), to: fmt(today) };
  }

  if (preset === 'this_month') {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: fmt(from), to: fmt(today) };
  }

  if (preset === 'last_month') {
    const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    return { from: fmt(firstDayLastMonth), to: fmt(lastDayLastMonth) };
  }

  // Formato YYYY-MM para mês específico
  if (/^\d{4}-\d{2}$/.test(preset)) {
    const [year, month] = preset.split('-').map(Number);
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0); // último dia do mês
    return { from: fmt(from), to: fmt(to) };
  }

  return { from: null, to: null };
}
