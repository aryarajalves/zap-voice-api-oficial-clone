import { useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { fetchWithAuth } from '../../../AuthContext';
import { API_URL } from '../../../config';
import { appendOrUpdateMessage } from '../utils/messageDeduplicator';

export const MEDIA_SIZE_LIMITS = {
    image:    5  * 1024 * 1024,  // 5 MB
    video:    16 * 1024 * 1024,  // 16 MB
    audio:    16 * 1024 * 1024,  // 16 MB
    document: 100 * 1024 * 1024, // 100 MB
};

export const MEDIA_SIZE_LABELS = {
    image: '5 MB', video: '16 MB', audio: '16 MB', document: '100 MB',
};

const ALLOWED_EXTENSIONS = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp',
    '.mp4', '.3gp', '.webm', '.mov', '.avi', '.mkv',
    '.pdf', '.docx', '.xlsx', '.pptx', '.txt', '.zip', '.rar',
    '.mp3', '.ogg', '.wav', '.aac', '.m4a'
];

export function useChatMediaUploader({ engine, selectedConvo, activeClient, replyingTo, setReplyingTo }) {
    const [isDraggingFile, setIsDraggingFile] = useState(false);
    const dragCounter = useRef(0);

    const processFileAttachment = (file) => {
        if (!file || !selectedConvo) return;

        const ext = file.name ? file.name.substring(file.name.lastIndexOf('.')).toLowerCase() : '';
        if (ext && !ALLOWED_EXTENSIONS.includes(ext)) {
            toast.error(`Extensão '${ext}' não permitida. Aceitamos formatos de imagem (JPG, PNG, WEBP, GIF), vídeo, áudio e documentos.`);
            return;
        }

        let messageType = 'document';
        if (file.type.startsWith('image/')) messageType = 'image';
        else if (file.type.startsWith('video/')) messageType = 'video';
        else if (file.type.startsWith('audio/')) messageType = 'audio';

        const sizeLimit = MEDIA_SIZE_LIMITS[messageType];
        if (file.size > sizeLimit) {
            const label = MEDIA_SIZE_LABELS[messageType];
            const fileMB = (file.size / 1024 / 1024).toFixed(1);
            toast.error(
                `Arquivo muito grande (${fileMB} MB). O WhatsApp aceita ${messageType === 'image' ? 'imagens' : messageType === 'video' ? 'vídeos' : messageType === 'audio' ? 'áudios' : 'documentos'} de até ${label}.`,
                { duration: 5000 }
            );
            return;
        }

        const localUrl = URL.createObjectURL(file);
        engine.setMediaPreview({ file, localUrl, messageType, fileUrl: null });
        engine.setPreviewCaption(engine.newMessage || '');
    };

    const handleMediaUpload = (e) => {
        const file = e.target.files[0];
        if (!file || !selectedConvo) return;
        e.target.value = null;
        processFileAttachment(file);
    };

    const handlePaste = (e) => {
        if (!selectedConvo) return;
        const clipboardItems = e.clipboardData?.items;
        if (!clipboardItems) return;

        for (let i = 0; i < clipboardItems.length; i++) {
            const item = clipboardItems[i];
            if (item.kind === 'file') {
                const file = item.getAsFile();
                if (file) {
                    e.preventDefault();
                    processFileAttachment(file);
                    break;
                }
            }
        }
    };

    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!selectedConvo) return;
        if (e.dataTransfer?.types?.includes('Files')) {
            dragCounter.current += 1;
            setIsDraggingFile(true);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!selectedConvo) return;
        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = 'copy';
        }
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current -= 1;
        if (dragCounter.current <= 0) {
            dragCounter.current = 0;
            setIsDraggingFile(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current = 0;
        setIsDraggingFile(false);
        if (!selectedConvo) return;

        const droppedFiles = e.dataTransfer?.files;
        if (droppedFiles && droppedFiles.length > 0) {
            processFileAttachment(droppedFiles[0]);
        }
    };

    const sendMedia = async (file, messageType, caption) => {
        const formData = new FormData();
        formData.append('file', file);

        const toastId = toast.loading('Fazendo upload e enviando arquivo...');
        engine.setIsSendingMedia(true);
        try {
            const uploadRes = await fetch(`${API_URL}/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'X-Client-ID': String(activeClient.id)
                },
                body: formData
            });

            if (!uploadRes.ok) {
                const errData = await uploadRes.json();
                throw new Error(errData.detail || 'Falha no upload do arquivo.');
            }

            const uploadResult = await uploadRes.json();
            const fileUrl = uploadResult.url;

            const mediaPayload = {
                media_url: fileUrl,
                message_type: messageType,
                caption: caption || ''
            };
            if (replyingTo?.wa_message_id) {
                mediaPayload.quoted_wa_message_id = replyingTo.wa_message_id;
            }

            const sendRes = await fetchWithAuth(`${API_URL}/chat/conversations/${selectedConvo.id}/media`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(mediaPayload)
            }, activeClient.id);

            if (sendRes.ok) {
                const sentMsg = await sendRes.json();
                engine.setMessages(prev => appendOrUpdateMessage(prev, sentMsg));
                engine.setShouldScrollToBottom(true);
                engine.loadConversationMedia(selectedConvo.id);
                toast.success('Mídia enviada com sucesso!', { id: toastId });
                engine.loadConversations(false);
                engine.setMediaPreview(null);
                engine.setPreviewCaption('');
                engine.setNewMessage('');
                if (setReplyingTo) setReplyingTo(null);
            } else {
                const errData = await sendRes.json();
                throw new Error(errData.detail || 'Erro ao enviar mídia.');
            }
        } catch (err) {
            toast.error(err.message || 'Erro ao enviar arquivo.', { id: toastId });
        } finally {
            engine.setIsSendingMedia(false);
        }
    };

    // Estado de áudio gravado aguardando pré-escuta antes do envio
    const [recordedAudio, setRecordedAudio] = useState(null);
    const [isSendingAudio, setIsSendingAudio] = useState(false);

    const startRecording = async () => {
        if (engine.timeLeft24h === 'Janela Fechada' || engine.isSending || isSendingAudio) return;
        if (recordedAudio) {
            if (recordedAudio.url) URL.revokeObjectURL(recordedAudio.url);
            setRecordedAudio(null);
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            engine.audioChunksRef.current = [];
            
            // Tentar os melhores codecs disponíveis no navegador
            let mimeType = 'audio/webm;codecs=opus';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
                    mimeType = 'audio/ogg;codecs=opus';
                } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
                    mimeType = 'audio/mp4';
                } else {
                    mimeType = '';
                }
            }

            const options = mimeType ? { mimeType } : {};
            const recorder = new MediaRecorder(stream, options);
            
            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    engine.audioChunksRef.current.push(e.data);
                }
            };

            recorder.start(100);
            engine.mediaRecorderRef.current = recorder;
            engine.setIsRecording(true);
            engine.setAudioSeconds(0);
            engine.audioTimerRef.current = setInterval(() => engine.setAudioSeconds(s => s + 1), 1000);
        } catch (err) {
            toast.error('Permissão de microfone negada ou indisponível.');
        }
    };

    const stopRecordingToPreview = () => {
        if (!engine.mediaRecorderRef.current) return;
        const currentSeconds = engine.audioSeconds || 1;
        clearInterval(engine.audioTimerRef.current);
        engine.setIsRecording(false);
        engine.setAudioSeconds(0);

        const recorder = engine.mediaRecorderRef.current;
        recorder.stream.getTracks().forEach(t => t.stop());

        recorder.onstop = () => {
            const mimeType = recorder.mimeType || 'audio/webm';
            const blob = new Blob(engine.audioChunksRef.current, { type: mimeType });
            const url = URL.createObjectURL(blob);
            setRecordedAudio({
                blob,
                url,
                duration: currentSeconds,
                mimeType
            });
            engine.mediaRecorderRef.current = null;
        };

        if (recorder.state !== 'inactive') {
            recorder.stop();
        }
    };

    const discardRecordedAudio = () => {
        if (recordedAudio?.url) {
            URL.revokeObjectURL(recordedAudio.url);
        }
        setRecordedAudio(null);
    };

    const sendRecordedAudio = async () => {
        if (!recordedAudio || !selectedConvo?.id || isSendingAudio) return;
        setIsSendingAudio(true);
        const toastId = toast.loading('Enviando áudio...');

        try {
            const ext = recordedAudio.mimeType?.includes('ogg') ? 'ogg' : 'webm';
            const file = new File([recordedAudio.blob], `audio_${Date.now()}.${ext}`, { 
                type: recordedAudio.mimeType || 'audio/webm' 
            });
            const formData = new FormData();
            formData.append('file', file);

            const uploadRes = await fetch(`${API_URL}/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'X-Client-ID': String(activeClient.id)
                },
                body: formData
            });

            if (!uploadRes.ok) throw new Error('Falha no upload do áudio.');
            const { url: fileUrl } = await uploadRes.json();

            const sendPayload = {
                media_url: fileUrl,
                message_type: 'audio'
            };
            if (replyingTo?.wa_message_id) {
                sendPayload.quoted_wa_message_id = replyingTo.wa_message_id;
            }

            const sendRes = await fetchWithAuth(`${API_URL}/chat/conversations/${selectedConvo.id}/media`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sendPayload)
            }, activeClient.id);

            if (sendRes.ok) {
                const sentMsg = await sendRes.json();
                engine.setMessages(prev => appendOrUpdateMessage(prev, sentMsg));
                engine.setShouldScrollToBottom(true);
                engine.loadConversationMedia(selectedConvo.id);
                discardRecordedAudio();
                if (setReplyingTo) setReplyingTo(null);
                toast.success('Áudio enviado!', { id: toastId });
            } else {
                const err = await sendRes.json();
                throw new Error(err.detail || 'Erro ao enviar áudio.');
            }
        } catch (err) {
            toast.error(err.message || 'Erro ao enviar áudio.', { id: toastId });
        } finally {
            setIsSendingAudio(false);
        }
    };

    const cancelRecording = () => {
        if (engine.mediaRecorderRef.current) {
            clearInterval(engine.audioTimerRef.current);
            engine.mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
            engine.mediaRecorderRef.current.onstop = null;
            if (engine.mediaRecorderRef.current.state !== 'inactive') {
                engine.mediaRecorderRef.current.stop();
            }
            engine.mediaRecorderRef.current = null;
        }
        engine.setIsRecording(false);
        engine.setAudioSeconds(0);
        discardRecordedAudio();
        toast('Gravação cancelada.');
    };

    return {
        isDraggingFile,
        handleMediaUpload,
        handlePaste,
        handleDragEnter,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        sendMedia,
        startRecording,
        stopRecordingToPreview,
        discardRecordedAudio,
        sendRecordedAudio,
        cancelRecording,
        recordedAudio,
        isSendingAudio
    };
}
