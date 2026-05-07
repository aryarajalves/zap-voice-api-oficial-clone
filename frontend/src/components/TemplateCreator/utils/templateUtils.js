export const hasMetaVarIssue = (text) => {
    if (!text || !/\{\{\d+\}\}/.test(text)) return false;
    const t = text.trim();
    return /^\{\{\d+\}\}/.test(t) || /\{\{\d+\}\}[\s\W]*$/.test(t);
};
