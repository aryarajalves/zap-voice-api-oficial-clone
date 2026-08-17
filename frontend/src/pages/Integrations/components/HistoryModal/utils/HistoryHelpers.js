export const COUNTRY_INFO = {
  BR: { flag: '🇧🇷', name: 'Brasil' },
  US: { flag: '🇺🇸', name: 'Estados Unidos' },
  PT: { flag: '🇵🇹', name: 'Portugal' },
  AR: { flag: '🇦🇷', name: 'Argentina' },
  CL: { flag: '🇨🇱', name: 'Chile' },
  CO: { flag: '🇨🇴', name: 'Colômbia' },
  MX: { flag: '🇲🇽', name: 'México' },
  PE: { flag: '🇵🇪', name: 'Peru' },
  UY: { flag: '🇺🇾', name: 'Uruguai' },
  PY: { flag: '🇵🇾', name: 'Paraguai' },
  BO: { flag: '🇧🇴', name: 'Bolívia' },
  VE: { flag: '🇻🇪', name: 'Venezuela' },
  EC: { flag: '🇪🇨', name: 'Equador' },
  GT: { flag: '🇬🇹', name: 'Guatemala' },
  SV: { flag: '🇸🇻', name: 'El Salvador' },
  HN: { flag: '🇭🇳', name: 'Honduras' },
  NI: { flag: '🇳🇮', name: 'Nicarágua' },
  CR: { flag: '🇨🇷', name: 'Costa Rica' },
  PA: { flag: '🇵🇦', name: 'Panamá' },
  GB: { flag: '🇬🇧', name: 'Reino Unido' },
  AU: { flag: '🇦🇺', name: 'Austrália' },
  CA: { flag: '🇨🇦', name: 'Canadá' },
  AD: { flag: '🇦🇩', name: 'Andorra' },
};

export const translateError = (msg) => {
  if (!msg) return "";
  let text = String(msg);
  
  const translations = [
    { regex: /No mapping found for event:/gi, replacement: "Nenhum mapeamento encontrado para o evento:" },
    { regex: /Parameter value is not valid/gi, replacement: "O valor do parâmetro é inválido (ex: número de telefone incompleto/incorreto)" },
    { regex: /Template name does not exist/gi, replacement: "O nome do template não existe" },
    { regex: /Invalid parameter/gi, replacement: "Parâmetro inválido" },
    { regex: /Phone field not found in payload/gi, replacement: "Campo de telefone não encontrado no payload" },
    { regex: /Configuração do WhatsApp ausente/gi, replacement: "Configuração do WhatsApp ausente" },
    { regex: /Duplicidade evitada/gi, replacement: "Duplicidade evitada" }
  ];

  for (const item of translations) {
    text = text.replace(item.regex, item.replacement);
  }
  return text;
};

export const getFlatKeys = (obj, prefix = '') => {
  if (!obj || typeof obj !== 'object') return [];
  return Object.entries(obj).reduce((acc, [key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return [...acc, fullKey, ...getFlatKeys(value, fullKey)];
    }
    return [...acc, fullKey];
  }, []);
};
