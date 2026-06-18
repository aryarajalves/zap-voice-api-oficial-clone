// Parse robusto de data: suporta múltiplos formatos e adiciona indicador UTC se ausente
export const parseDateSafe = (raw) => {
  if (!raw) return 'Data indisponível';
  try {
    // Normaliza: substitui espaço por T, e +00:00 por Z se necessário
    const normalized = String(raw).replace(' ', 'T').replace(/\+00:00$/, 'Z');
    // Se não tem indicador de timezone, assume UTC adicionando Z
    const withTz = /[Z+\-]\d*$/.test(normalized) || normalized.endsWith('Z')
      ? normalized
      : normalized + 'Z';
    const d = new Date(withTz);
    return isNaN(d.getTime()) ? 'Data inválida' : d.toLocaleString('pt-BR');
  } catch {
    return 'Data inválida';
  }
};
