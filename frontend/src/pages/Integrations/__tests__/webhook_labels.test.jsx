import { describe, it, expect } from 'vitest';

describe("Etiquetas na Conversa (Mapeamento de Webhook)", () => {
    it("deve mapear corretamente o array de etiquetas retornado por /chat/labels para o SearchableSelect", () => {
        const chatwootLabels = ["suuporte acesso", "ja_disparou", "aceitou-convite", "bloquear"];
        
        const options = [...new Set((chatwootLabels || []).map(l => typeof l === 'object' ? (l.title || l.name || l.label) : l))].filter(Boolean).map(l => ({ value: l, label: l }));

        expect(options.length).toBe(4);
        expect(options).toEqual([
            { value: "suuporte acesso", label: "suuporte acesso" },
            { value: "ja_disparou", label: "ja_disparou" },
            { value: "aceitou-convite", label: "aceitou-convite" },
            { value: "bloquear", label: "bloquear" }
        ]);
    });
});
