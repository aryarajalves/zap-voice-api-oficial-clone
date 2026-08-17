import React from 'react';

/**
 * Expressão regular para identificar URLs no texto (com http/https, www, ou domínios comuns).
 */
const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.(?:com|com\.br|net|org|io|app|dev|shop|me|site|tech|online|store|ai|co)(?:\/[^\s]*)?)/gi;

/**
 * Remove pontuações acidentais no final da URL capturada (ex: vírgulas, pontos finais, parênteses).
 */
function cleanUrl(rawUrl) {
    let url = rawUrl;
    let trailing = '';
    
    while (url.length > 0 && /[.,!?;:)]$/.test(url)) {
        trailing = url.slice(-1) + trailing;
        url = url.slice(0, -1);
    }
    
    return { clean: url, trailing };
}

/**
 * Renderiza um texto formatado transformando qualquer link detectado em elemento <a> clicável.
 * @param {string} text - Conteúdo em texto da mensagem
 * @param {string} [className] - Classes adicionais para o link
 * @returns {React.ReactNode} - Nós React com links clicáveis e texto original
 */
export function renderLinkedText(text, className = '') {
    if (!text || typeof text !== 'string') return text || null;

    const parts = [];
    let lastIndex = 0;
    let match;

    // Reset regex index
    URL_REGEX.lastIndex = 0;

    while ((match = URL_REGEX.exec(text)) !== null) {
        const matchIndex = match.index;
        const rawMatched = match[0];

        // Texto antes do link
        if (matchIndex > lastIndex) {
            parts.push(text.substring(lastIndex, matchIndex));
        }

        const { clean: url, trailing } = cleanUrl(rawMatched);

        if (url) {
            let href = url;
            if (!/^https?:\/\//i.test(href)) {
                href = `https://${href}`;
            }

            parts.push(
                <a
                    key={`link-${matchIndex}-${url}`}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className={`underline underline-offset-2 hover:opacity-80 transition-all cursor-pointer break-all text-sky-300 hover:text-sky-100 font-semibold ${className}`}
                >
                    {url}
                </a>
            );
        }

        // Adiciona de volta qualquer pontuação que estava colada ao fim da URL
        if (trailing) {
            parts.push(trailing);
        }

        lastIndex = matchIndex + rawMatched.length;
    }

    // Restante do texto após o último link
    if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
    }

    return parts;
}
