import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

describe('ChatConversations Media Drag Drop & Paste Utils', () => {
    const MEDIA_SIZE_LIMITS = {
        image:    5  * 1024 * 1024,  // 5 MB
        video:    16 * 1024 * 1024,  // 16 MB
        audio:    16 * 1024 * 1024,  // 16 MB
        document: 100 * 1024 * 1024, // 100 MB
    };

    const detectMessageType = (mimeType) => {
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.startsWith('video/')) return 'video';
        if (mimeType.startsWith('audio/')) return 'audio';
        return 'document';
    };

    it('identifica corretamente os tipos de mensagem por MIME', () => {
        expect(detectMessageType('image/png')).toBe('image');
        expect(detectMessageType('video/mp4')).toBe('video');
        expect(detectMessageType('audio/webm')).toBe('audio');
        expect(detectMessageType('application/pdf')).toBe('document');
        expect(detectMessageType('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('document');
    });

    it('valida limites de tamanho para mídias', () => {
        const smallImg = { size: 2 * 1024 * 1024, type: 'image/png' };
        const hugeImg = { size: 10 * 1024 * 1024, type: 'image/png' };
        const hugePdf = { size: 120 * 1024 * 1024, type: 'application/pdf' };
        const validPdf = { size: 50 * 1024 * 1024, type: 'application/pdf' };

        expect(smallImg.size <= MEDIA_SIZE_LIMITS[detectMessageType(smallImg.type)]).toBe(true);
        expect(hugeImg.size <= MEDIA_SIZE_LIMITS[detectMessageType(hugeImg.type)]).toBe(false);
        expect(hugePdf.size <= MEDIA_SIZE_LIMITS[detectMessageType(hugePdf.type)]).toBe(false);
        expect(validPdf.size <= MEDIA_SIZE_LIMITS[detectMessageType(validPdf.type)]).toBe(true);
    });

    it('gerencia dragCounter sem flickering ao passar sobre sub-elementos', () => {
        let dragCounter = 0;
        let isDraggingFile = false;

        const onDragEnter = () => {
            dragCounter += 1;
            isDraggingFile = true;
        };

        const onDragLeave = () => {
            dragCounter -= 1;
            if (dragCounter <= 0) {
                dragCounter = 0;
                isDraggingFile = false;
            }
        };

        // Entrou na área do chat
        onDragEnter();
        expect(dragCounter).toBe(1);
        expect(isDraggingFile).toBe(true);

        // Passou por cima de um elemento filho (ex: mensagem ou botão)
        onDragEnter(); // enter no filho
        expect(dragCounter).toBe(2);
        expect(isDraggingFile).toBe(true);

        onDragLeave(); // leave no pai acionado pelo evento bubbling
        expect(dragCounter).toBe(1);
        expect(isDraggingFile).toBe(true); // Permanece TRUE (sem flickering!)

        // Soltou o arquivo ou saiu completamente da tela
        onDragLeave();
        expect(dragCounter).toBe(0);
        expect(isDraggingFile).toBe(false);
    });
});
