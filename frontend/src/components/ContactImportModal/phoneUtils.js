export const COUNTRY_TO_DDI_MAP = {
  "brasil": "55", "brazil": "55", "br": "55",
  "portugal": "351", "pt": "351",
  "estados unidos": "1", "united states": "1", "eua": "1", "usa": "1", "us": "1",
  "espanha": "34", "spain": "34", "es": "34",
  "emirados árabes unidos": "971", "emirados arabes unidos": "971", "uae": "971",
  "itália": "39", "italia": "39", "italy": "39", "it": "39",
  "austrália": "61", "australia": "61", "au": "61",
  "romênia": "40", "romenia": "40", "romania": "40", "ro": "40",
  "guatemala": "502", "gt": "502",
  "frança": "33", "franca": "33", "france": "33", "fr": "33",
  "canadá": "1", "canada": "1", "ca": "1",
  "suíça": "41", "suica": "41", "switzerland": "41", "ch": "41",
  "holanda": "31", "paises baixos": "31", "netherlands": "31", "nl": "31",
  "argentina": "54", "ar": "54",
  "chile": "56", "cl": "56",
  "uruguai": "598", "uruguay": "598", "uy": "598",
  "colômbia": "57", "colombia": "57", "co": "57",
  "méxico": "52", "mexico": "52", "mx": "52",
  "angola": "244", "ao": "244",
  "moçambique": "258", "mocambique": "258", "mozambique": "258", "mz": "258",
  "japão": "81", "japao": "81", "japan": "81", "jp": "81",
  "alemanha": "49", "germany": "49", "de": "49",
  "reino unido": "44", "united kingdom": "44", "uk": "44", "gb": "44"
};

export const VALID_BRAZIL_DDDS = new Set([
  "11", "12", "13", "14", "15", "16", "17", "18", "19",
  "21", "22", "24", "27", "28",
  "31", "32", "33", "34", "35", "37", "38",
  "41", "42", "43", "44", "45", "46", "47", "48", "49",
  "51", "53", "54", "55",
  "61", "62", "63", "64", "65", "66", "67", "68", "69",
  "71", "73", "74", "75", "77", "79",
  "81", "82", "83", "84", "85", "86", "87", "88", "89",
  "91", "92", "93", "94", "95", "96", "97", "98", "99"
]);

export const INTERNATIONAL_DDI_INFO = {
  "351": { country: "Portugal", flag: "🇵🇹" },
  "1": { country: "EUA / Canadá", flag: "🇺🇸" },
  "34": { country: "Espanha", flag: "🇪🇸" },
  "39": { country: "Itália", flag: "🇮🇹" },
  "33": { country: "França", flag: "🇫🇷" },
  "44": { country: "Reino Unido", flag: "🇬🇧" },
  "49": { country: "Alemanha", flag: "🇩🇪" },
  "54": { country: "Argentina", flag: "🇦🇷" },
  "56": { country: "Chile", flag: "🇨🇱" },
  "57": { country: "Colômbia", flag: "🇨🇴" },
  "52": { country: "México", flag: "🇲🇽" },
  "598": { country: "Uruguai", flag: "🇺🇾" },
  "595": { country: "Paraguai", flag: "🇵🇾" },
  "591": { country: "Bolívia", flag: "🇧🇴" },
  "51": { country: "Peru", flag: "🇵🇪" },
  "244": { country: "Angola", flag: "🇦🇴" },
  "258": { country: "Moçambique", flag: "🇲🇿" },
  "81": { country: "Japão", flag: "🇯🇵" },
  "971": { country: "Emirados Árabes", flag: "🇦🇪" },
  "41": { country: "Suíça", flag: "🇨🇭" },
  "31": { country: "Holanda", flag: "🇳🇱" },
  "61": { country: "Austrália", flag: "🇦🇺" },
};

export const digitsOnly = (v) => {
  let s = String(v ?? '').trim();
  if (/^-?\d+\.0+$/.test(s)) s = s.replace(/\.0+$/, '');
  return s.replace(/\D/g, '');
};

export const parseDdiVal = (v) => {
  if (!v) return '';
  const strVal = String(v).trim().toLowerCase();
  if (COUNTRY_TO_DDI_MAP[strVal]) return COUNTRY_TO_DDI_MAP[strVal];
  return digitsOnly(v);
};

export const detectPhoneOrigin = (dddValRaw, numValRaw, rawDdiValRaw) => {
  const cleanRawDdi = parseDdiVal(rawDdiValRaw);
  const cleanDdd = digitsOnly(dddValRaw);
  const cleanNum = digitsOnly(numValRaw);

  if (cleanRawDdi) {
    if (cleanRawDdi === '55') return { isBrazilian: true, country: 'Brasil', flag: '🇧🇷', detectedDdi: '55' };
    const info = INTERNATIONAL_DDI_INFO[cleanRawDdi];
    if (info) return { isBrazilian: false, country: info.country, flag: info.flag, detectedDdi: cleanRawDdi };
    return { isBrazilian: false, country: `DDI +${cleanRawDdi}`, flag: '🌍', detectedDdi: cleanRawDdi };
  }

  const rawStr = String(numValRaw ?? '').trim();
  const isExplicitPlus = rawStr.startsWith('+');

  if (!cleanNum) {
    return { isBrazilian: true, country: 'Brasil', flag: '🇧🇷', detectedDdi: '55' };
  }

  if (isExplicitPlus) {
    if (cleanNum.startsWith('55') && (cleanNum.length === 12 || cleanNum.length === 13)) {
      return { isBrazilian: true, country: 'Brasil', flag: '🇧🇷', detectedDdi: '55' };
    }
    const ddis = Object.keys(INTERNATIONAL_DDI_INFO).sort((a, b) => b.length - a.length);
    for (const ddi of ddis) {
      if (cleanNum.startsWith(ddi)) {
        const info = INTERNATIONAL_DDI_INFO[ddi];
        return { isBrazilian: false, country: info.country, flag: info.flag, detectedDdi: ddi };
      }
    }
    return { isBrazilian: false, country: 'Internacional', flag: '🌍', detectedDdi: '' };
  }

  if (cleanNum.startsWith('55') && (cleanNum.length === 12 || cleanNum.length === 13)) {
    return { isBrazilian: true, country: 'Brasil', flag: '🇧🇷', detectedDdi: '55' };
  }

  // 12 ou mais dígitos sem 55: 100% internacional
  if (cleanNum.length >= 12 && !cleanNum.startsWith('55')) {
    const ddis = Object.keys(INTERNATIONAL_DDI_INFO).sort((a, b) => b.length - a.length);
    for (const ddi of ddis) {
      if (cleanNum.startsWith(ddi)) {
        const info = INTERNATIONAL_DDI_INFO[ddi];
        return { isBrazilian: false, country: info.country, flag: info.flag, detectedDdi: ddi };
      }
    }
    return { isBrazilian: false, country: 'Internacional', flag: '🌍', detectedDdi: '' };
  }

  if (cleanNum.length === 11) {
    const dddCandidate = cleanNum.slice(0, 2);
    if (VALID_BRAZIL_DDDS.has(dddCandidate) && cleanNum[2] === '9') {
      return { isBrazilian: true, country: 'Brasil', flag: '🇧🇷', detectedDdi: '55' };
    }
    if (cleanNum.startsWith('1')) {
      return { isBrazilian: false, country: 'EUA / Canadá', flag: '🇺🇸', detectedDdi: '1' };
    }
  }

  if (cleanNum.length === 10) {
    const dddCandidate = cleanNum.slice(0, 2);
    if (VALID_BRAZIL_DDDS.has(dddCandidate) && ['2', '3', '4', '5'].includes(cleanNum[2])) {
      return { isBrazilian: true, country: 'Brasil', flag: '🇧🇷', detectedDdi: '55' };
    }
  }

  if (cleanDdd && VALID_BRAZIL_DDDS.has(cleanDdd)) {
    return { isBrazilian: true, country: 'Brasil', flag: '🇧🇷', detectedDdi: '55' };
  }

  if ([8, 9, 10, 11].includes(cleanNum.length)) {
    return { isBrazilian: true, country: 'Brasil', flag: '🇧🇷', detectedDdi: '55' };
  }

  return { isBrazilian: false, country: 'Internacional', flag: '🌍', detectedDdi: '' };
};

export const decomposeAndBuildPhone = (dddValRaw, numValRaw, rawDdiValRaw, manualDdiRaw, forceApplyDdi = null) => {
  const dddClean = digitsOnly(dddValRaw);
  const numClean = digitsOnly(numValRaw);
  const rawDdiClean = parseDdiVal(rawDdiValRaw);
  const manualDdiClean = parseDdiVal(manualDdiRaw);
  const ddiClean = rawDdiClean || manualDdiClean;

  if (!numClean && !dddClean) {
    return { ddi: ddiClean, ddd: '', number: '', full: '', isBrazilian: true, country: 'Brasil', flag: '🇧🇷', ddiApplied: false };
  }

  const origin = detectPhoneOrigin(dddValRaw, numValRaw, rawDdiValRaw);
  const isBrazilian = origin.isBrazilian;

  let applyDdi = false;
  if (forceApplyDdi !== null) {
    applyDdi = Boolean(forceApplyDdi);
  } else {
    if (!isBrazilian && ddiClean === '55') {
      applyDdi = false;
    } else {
      applyDdi = Boolean(ddiClean);
    }
  }

  if (!applyDdi) {
    const detectedDdi = origin.detectedDdi || '';
    if (detectedDdi && numClean.startsWith(detectedDdi) && numClean.length >= detectedDdi.length + 6) {
      const remainder = numClean.slice(detectedDdi.length);
      return { ddi: detectedDdi, ddd: dddClean, number: remainder, full: numClean, isBrazilian, country: origin.country, flag: origin.flag, ddiApplied: false };
    }
    if (ddiClean === '55' && numClean.startsWith('55') && numClean.length >= 12) {
      const remainder = numClean.slice(2);
      return { ddi: '', ddd: dddClean, number: remainder, full: `${dddClean}${remainder}`, isBrazilian, country: origin.country, flag: origin.flag, ddiApplied: false };
    }
    const base = `${dddClean}${numClean}`;
    return { ddi: '', ddd: dddClean, number: numClean, full: base, isBrazilian, country: origin.country, flag: origin.flag, ddiApplied: false };
  }

  if (ddiClean === '55') {
    if (numClean.startsWith('55') && numClean.length >= 12) {
      const remainder = numClean.slice(2);
      if (dddClean && remainder.startsWith(dddClean)) {
        return { ddi: '55', ddd: dddClean, number: remainder.slice(dddClean.length), full: numClean, isBrazilian, country: origin.country, flag: origin.flag, ddiApplied: true };
      } else if (dddClean) {
        return { ddi: '55', ddd: dddClean, number: remainder, full: numClean, isBrazilian, country: origin.country, flag: origin.flag, ddiApplied: true };
      } else {
        return { ddi: '55', ddd: '', number: remainder, full: numClean, isBrazilian, country: origin.country, flag: origin.flag, ddiApplied: true };
      }
    }
  } else if (ddiClean) {
    if (numClean.startsWith(ddiClean) && numClean.length >= ddiClean.length + 8) {
      const remainder = numClean.slice(ddiClean.length);
      return { ddi: ddiClean, ddd: dddClean, number: remainder, full: numClean, isBrazilian, country: origin.country, flag: origin.flag, ddiApplied: true };
    }
  }

  const base = `${dddClean}${numClean}`;

  if (ddiClean === '55') {
    if (base.startsWith('55') && base.length >= 12) {
      const remainder = base.slice(2);
      const retDdd = dddClean || '';
      const retNum = !retDdd ? remainder : numClean;
      return { ddi: '55', ddd: retDdd, number: retNum, full: base, isBrazilian, country: origin.country, flag: origin.flag, ddiApplied: true };
    } else {
      const full = `55${base}`;
      return { ddi: '55', ddd: dddClean, number: numClean, full, isBrazilian, country: origin.country, flag: origin.flag, ddiApplied: true };
    }
  } else if (ddiClean) {
    if (base.startsWith(ddiClean) && base.length >= ddiClean.length + 8) {
      const retNum = !dddClean ? base.slice(ddiClean.length) : numClean;
      return { ddi: ddiClean, ddd: dddClean, number: retNum, full: base, isBrazilian, country: origin.country, flag: origin.flag, ddiApplied: true };
    } else {
      const full = `${ddiClean}${base}`;
      return { ddi: ddiClean, ddd: dddClean, number: numClean, full, isBrazilian, country: origin.country, flag: origin.flag, ddiApplied: true };
    }
  } else {
    if (base.startsWith('55') && base.length >= 12) {
      const remainder = base.slice(2);
      return { ddi: '55', ddd: dddClean, number: !dddClean ? remainder : numClean, full: base, isBrazilian, country: origin.country, flag: origin.flag, ddiApplied: true };
    }
    return { ddi: '', ddd: dddClean, number: numClean, full: base, isBrazilian, country: origin.country, flag: origin.flag, ddiApplied: false };
  }
};
