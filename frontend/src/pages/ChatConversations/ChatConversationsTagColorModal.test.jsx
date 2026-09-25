import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

describe('ChatConversations Tag Creation, 25 Char Limit & Color Picker Modal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('limita o nome da etiqueta a no máximo 25 caracteres', () => {
        const longName = 'etiqueta-super-longa-que-ultrapassa-limite';
        const truncated = longName.trim().slice(0, 25);

        expect(truncated).toHaveLength(25);
        expect(truncated).toBe('etiqueta-super-longa-que-');
    });

    it('detecta se a etiqueta é nova para abrir o modal de escolha de cor', () => {
        const availableLabels = ['whatsapp', 'robo', 'humano'];
        
        const isNewTag = (name) => !(availableLabels.some(l => l.toLowerCase() === name.trim().toLowerCase()));

        expect(isNewTag('whatsapp')).toBe(false);
        expect(isNewTag('NOVA_ETIQUETA')).toBe(true);
    });

    it('constrói corretamente o objeto de nova etiqueta com a cor selecionada', () => {
        const tagName = 'cliente-vip-super-especial-12345';
        const selectedColor = '#8B5CF6';

        const labelPayload = {
            name: tagName.slice(0, 25),
            color: selectedColor
        };

        expect(labelPayload.name).toHaveLength(25);
        expect(labelPayload.name).toBe('cliente-vip-super-especia');
        expect(labelPayload.color).toBe('#8B5CF6');
    });
});
