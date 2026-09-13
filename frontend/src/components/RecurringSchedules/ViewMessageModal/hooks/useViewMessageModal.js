import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { convertComponentsToParams, buildTemplateComponents } from '../utils/templateParamUtils';

export function useViewMessageModal({ viewingMessageSchedule, templates, onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [sendType, setSendType] = useState('template');
  const [selectedTemplateName, setSelectedTemplateName] = useState('');
  const [selectedFunnelId, setSelectedFunnelId] = useState('');
  const [directMessage, setDirectMessage] = useState('');
  const [templateParams, setTemplateParams] = useState({});
  const [buttonActions, setButtonActions] = useState({});

  useEffect(() => {
    if (viewingMessageSchedule) {
      setIsEditing(false);
      setSendType('template');
      if (viewingMessageSchedule.template_name) {
        setSelectedTemplateName(viewingMessageSchedule.template_name);
        setTemplateParams(convertComponentsToParams(viewingMessageSchedule.template_components));
        setButtonActions(viewingMessageSchedule.button_actions || {});
      } else {
        setSelectedTemplateName('');
        setTemplateParams({});
        setButtonActions({});
      }
    }
  }, [viewingMessageSchedule]);

  const selectedTemplateObj = templates.find(t => t.name === selectedTemplateName);

  const handleParamChange = (key, value) => {
    setTemplateParams(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveClick = () => {
    const payload = {
      template_name: null,
      template_language: null,
      template_components: null,
      funnel_id: null,
      direct_message: null,
      button_actions: null
    };

    if (sendType === 'template') {
      if (!selectedTemplateName) {
        toast.error('Por favor, selecione um template');
        return;
      }
      const tObj = templates.find(t => t.name === selectedTemplateName);
      payload.template_name = selectedTemplateName;
      payload.template_language = tObj?.language || 'pt_BR';
      payload.button_actions = Object.keys(buttonActions).length > 0 ? buttonActions : null;
      payload.template_components = buildTemplateComponents(tObj, templateParams);
    } else if (sendType === 'funnel') {
      if (!selectedFunnelId) {
        toast.error('Por favor, selecione um funil');
        return;
      }
      payload.funnel_id = parseInt(selectedFunnelId);
    } else {
      if (!directMessage.trim()) {
        toast.error('Por favor, digite a mensagem');
        return;
      }
      payload.direct_message = directMessage;
    }

    onSave?.(viewingMessageSchedule?.id, payload);
  };

  return {
    isEditing,
    setIsEditing,
    sendType,
    setSendType,
    selectedTemplateName,
    setSelectedTemplateName,
    selectedTemplateObj,
    selectedFunnelId,
    setSelectedFunnelId,
    directMessage,
    setDirectMessage,
    templateParams,
    setTemplateParams,
    buttonActions,
    setButtonActions,
    handleParamChange,
    handleSaveClick
  };
}
