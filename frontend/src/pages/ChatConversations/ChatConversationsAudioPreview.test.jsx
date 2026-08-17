import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AudioPreviewPlayer from './components/AudioPreviewPlayer';
import ActiveChatInput from './components/ActiveChatInput';

describe('AudioPreviewPlayer & Audio Recording Preview', () => {
    it('deve renderizar o AudioPreviewPlayer com botões de play, descartar e enviar', () => {
        const handleCancel = vi.fn();
        const handleSend = vi.fn();

        render(
            <AudioPreviewPlayer
                audioUrl="blob:http://localhost:5176/fake-audio-blob"
                duration={15}
                onCancel={handleCancel}
                onSend={handleSend}
                isSending={false}
            />
        );

        expect(screen.getByTitle('Ouvir áudio gravado')).toBeInTheDocument();
        expect(screen.getByTitle('Descartar gravação')).toBeInTheDocument();
        expect(screen.getByTitle('Enviar áudio para o cliente')).toBeInTheDocument();
        expect(screen.getByText('00:15')).toBeInTheDocument();
    });

    it('deve acionar onCancel ao clicar no botão de descartar gravação', () => {
        const handleCancel = vi.fn();
        const handleSend = vi.fn();

        render(
            <AudioPreviewPlayer
                audioUrl="blob:http://localhost:5176/fake-audio-blob"
                duration={10}
                onCancel={handleCancel}
                onSend={handleSend}
                isSending={false}
            />
        );

        fireEvent.click(screen.getByTitle('Descartar gravação'));
        expect(handleCancel).toHaveBeenCalledTimes(1);
    });

    it('deve acionar onSend ao clicar no botão de enviar áudio gravado', () => {
        const handleCancel = vi.fn();
        const handleSend = vi.fn();

        render(
            <AudioPreviewPlayer
                audioUrl="blob:http://localhost:5176/fake-audio-blob"
                duration={10}
                onCancel={handleCancel}
                onSend={handleSend}
                isSending={false}
            />
        );

        fireEvent.click(screen.getByTitle('Enviar áudio para o cliente'));
        expect(handleSend).toHaveBeenCalledTimes(1);
    });

    it('deve desabilitar botões e mostrar estado de carregamento quando isSending for true', () => {
        render(
            <AudioPreviewPlayer
                audioUrl="blob:http://localhost:5176/fake-audio-blob"
                duration={10}
                onCancel={vi.fn()}
                onSend={vi.fn()}
                isSending={true}
            />
        );

        expect(screen.getByText('Enviando...')).toBeInTheDocument();
        expect(screen.getByTitle('Enviar áudio para o cliente')).toBeDisabled();
        expect(screen.getByTitle('Descartar gravação')).toBeDisabled();
    });

    it('deve renderizar a barra de gravação ativa no ActiveChatInput quando engine.isRecording for true', () => {
        const mockEngine = {
            newMessage: '',
            setNewMessage: vi.fn(),
            isRecording: true,
            audioSeconds: 5,
            isSending: false,
            timeLeft24h: '23h 59m',
            handleSendMessage: vi.fn()
        };

        render(
            <ActiveChatInput
                engine={mockEngine}
                selectedConvo={{ id: 1, phone: '5511999999999' }}
                replyingTo={null}
                setReplyingTo={vi.fn()}
                chatInputRef={{ current: null }}
                handleMediaUpload={vi.fn()}
                setShowTemplateModal={vi.fn()}
                setIsMaximizedInputOpen={vi.fn()}
                startRecording={vi.fn()}
                stopRecordingToPreview={vi.fn()}
                discardRecordedAudio={vi.fn()}
                sendRecordedAudio={vi.fn()}
                cancelRecording={vi.fn()}
                recordedAudio={null}
                isSendingAudio={false}
            />
        );

        expect(screen.getByText(/Gravando áudio... 00:05/i)).toBeInTheDocument();
        expect(screen.getByTitle('Parar gravação e ouvir antes de enviar')).toBeInTheDocument();
        expect(screen.getByTitle('Cancelar e descartar gravação')).toBeInTheDocument();
    });

    it('deve renderizar o AudioPreviewPlayer dentro de ActiveChatInput quando houver recordedAudio', () => {
        const mockEngine = {
            newMessage: '',
            setNewMessage: vi.fn(),
            isRecording: false,
            audioSeconds: 0,
            isSending: false,
            timeLeft24h: '23h 59m',
            handleSendMessage: vi.fn()
        };

        const recordedAudio = {
            url: 'blob:http://localhost:5176/preview-blob',
            blob: new Blob(['dummy'], { type: 'audio/webm' }),
            duration: 8
        };

        render(
            <ActiveChatInput
                engine={mockEngine}
                selectedConvo={{ id: 1, phone: '5511999999999' }}
                replyingTo={null}
                setReplyingTo={vi.fn()}
                chatInputRef={{ current: null }}
                handleMediaUpload={vi.fn()}
                setShowTemplateModal={vi.fn()}
                setIsMaximizedInputOpen={vi.fn()}
                startRecording={vi.fn()}
                stopRecordingToPreview={vi.fn()}
                discardRecordedAudio={vi.fn()}
                sendRecordedAudio={vi.fn()}
                cancelRecording={vi.fn()}
                recordedAudio={recordedAudio}
                isSendingAudio={false}
            />
        );

        expect(screen.getByTitle('Ouvir áudio gravado')).toBeInTheDocument();
        expect(screen.getByTitle('Enviar áudio para o cliente')).toBeInTheDocument();
        expect(screen.getByTitle('Descartar gravação')).toBeInTheDocument();
    });
});
