/**
 * O backend guarda/retorna datas em UTC "ingênuo" (sem 'Z' no fim, ex:
 * "2026-07-03T10:15:30"). Sem isso, `new Date(...)` interpreta a string como
 * horário LOCAL do navegador, deslocando o cálculo pelo fuso do usuário.
 */
export function parseUtcDate(raw) {
  if (!raw) return null;
  const str = String(raw);
  const hasTimezone = /[Zz]$|[+-]\d{2}:?\d{2}$/.test(str);
  const date = new Date(hasTimezone ? str : `${str}Z`);
  return isNaN(date.getTime()) ? null : date;
}

export function formatDateBrasilia(isoStr) {
  if (!isoStr) return '---';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '---';
    return d.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '---';
  }
}
