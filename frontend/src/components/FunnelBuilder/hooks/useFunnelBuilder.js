import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';
import { useClient } from '../../../contexts/ClientContext';
import { toast } from 'react-hot-toast';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { 
    KeyboardSensor, 
    PointerSensor, 
    useSensor, 
    useSensors,
    closestCenter 
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

export const useFunnelBuilder = ({ onSave, initialData }) => {
    const { activeClient } = useClient();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [triggerPhrase, setTriggerPhrase] = useState('');
    const [allowedPhone, setAllowedPhone] = useState('');
    const [steps, setSteps] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [currentFunnelId, setCurrentFunnelId] = useState(null);

    // DND Sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Fetch Templates
    useEffect(() => {
        if (!activeClient) return;
        fetchWithAuth(`${API_URL}/whatsapp/templates`, {}, activeClient.id)
            .then(res => {
                if (res.ok) return res.json();
                throw new Error('Falha ao carregar templates');
            })
            .then(data => {
                if (Array.isArray(data)) setTemplates(data);
                else setTemplates([]);
            })
            .catch(err => {
                console.error("Error loading templates:", err);
                setTemplates([]);
            });
    }, [activeClient]);

    // Initialize with data
    useEffect(() => {
        const newId = initialData ? initialData.id : 'new';
        if (newId !== currentFunnelId) {
            setCurrentFunnelId(newId);
            if (initialData) {
                setName(initialData.name);
                setDescription(initialData.description || '');
                setTriggerPhrase(initialData.trigger_phrase || '');
                setAllowedPhone(initialData.allowed_phone || '');
                setSteps(initialData.steps.map(s => ({
                    ...s,
                    id: s.id || Date.now() + Math.random(),
                    uploading: false
                })));
            } else {
                setName('');
                setDescription('');
                setTriggerPhrase('');
                setAllowedPhone('');
                setSteps([]);
            }
        }
    }, [initialData, currentFunnelId]);

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setSteps((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const addStep = (type) => {
        setSteps([...steps, { type, content: '', delay: 0, id: Date.now() }]);
    };

    const updateStep = (id, field, value) => {
        setSteps(prevSteps => prevSteps.map(step => step.id === id ? { ...step, [field]: value } : step));
    };

    const removeStep = (id) => {
        setSteps(steps.filter(step => step.id !== id));
    };

    const handleSave = () => {
        const isUploading = steps.some(s => s.uploading);
        if (isUploading) {
            toast.error("Aguarde o upload dos arquivos terminar.");
            return;
        }

        for (let i = 0; i < steps.length; i++) {
            const s = steps[i];
            if (['image', 'audio', 'video', 'document', 'poll'].includes(s.type)) {
                if (!s.content || (typeof s.content === 'string' && s.content.trim() === '')) {
                    toast.error(`A etapa ${i + 1} (${s.type === 'poll' ? 'Enquete' : s.type}) precisa de conteúdo/arquivo.`);
                    return;
                }
            }
            if (s.type === 'message' && (!s.content || s.content.trim() === '')) {
                toast.error(`A etapa ${i + 1} (Mensagem) está vazia.`);
                return;
            }
        }

        onSave({ 
            name, 
            description, 
            steps, 
            trigger_phrase: triggerPhrase, 
            allowed_phone: allowedPhone 
        });
    };

    return {
        name, setName,
        description, setDescription,
        triggerPhrase, setTriggerPhrase,
        allowedPhone, setAllowedPhone,
        steps, setSteps,
        templates,
        currentFunnelId,
        activeClient,
        sensors,
        handleDragEnd,
        addStep,
        updateStep,
        removeStep,
        handleSave,
        closestCenter
    };
};
