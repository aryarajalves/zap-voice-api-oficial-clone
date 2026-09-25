import { useState, useEffect, useRef } from 'react';
import { fetchWithAuth } from '../../../../../AuthContext';
import { API_URL } from '../../../../../config';

export function useBulkTagModal({
  isOpen,
  onClose,
  chatLabels = [],
  contactLabels = [],
  availableLabels = [],
  availableLabelsDetails = [],
  getLabelColor,
  selectedBulkTag,
  setSelectedBulkTag,
  customBulkTag,
  setCustomBulkTag,
  onApply,
  loadAvailableLabels,
  activeClientId,
  initialChatLabels = [],
  initialContactLabels = []
}) {
  const [targetCategory, setTargetCategory] = useState('chat'); // 'chat' | 'contacts'
  const [searchTerm, setSearchTerm] = useState('');

  const getInitialForCategory = (cat) => {
    const list = cat === 'contacts' ? initialContactLabels : initialChatLabels;
    const arr = Array.isArray(list) ? list : [];
    const initial = [];
    arr.forEach(t => {
      const clean = String(t || '').trim();
      if (clean && !initial.some(x => x.toLowerCase() === clean.toLowerCase())) {
        initial.push(clean);
      }
    });
    if (selectedBulkTag && selectedBulkTag.trim() && !initial.some(x => x.toLowerCase() === selectedBulkTag.trim().toLowerCase())) {
      initial.push(selectedBulkTag.trim());
    }
    if (customBulkTag && customBulkTag.trim() && !initial.some(x => x.toLowerCase() === customBulkTag.trim().toLowerCase())) {
      initial.push(customBulkTag.trim());
    }
    return initial;
  };

  const [selectedTags, setSelectedTags] = useState(() => getInitialForCategory('chat'));

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createTagName, setCreateTagName] = useState('');
  const [createTagColor, setCreateTagColor] = useState('#3B82F6');
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);
  const [customColorsMap, setCustomColorsMap] = useState({});

  const searchInputRef = useRef(null);
  const prevIsOpenRef = useRef(false);
  const loadLabelsRef = useRef(loadAvailableLabels);
  loadLabelsRef.current = loadAvailableLabels;

  const resolveColor = (label) => {
    if (!label) return '#3B82F6';
    const key = String(label).toLowerCase();
    if (customColorsMap[key]) {
      return customColorsMap[key];
    }
    if (typeof getLabelColor === 'function') {
      const col = getLabelColor(label);
      if (col && col !== '#3B82F6') return col;
    }
    if (Array.isArray(availableLabelsDetails)) {
      const found = availableLabelsDetails.find(
        (l) => l.name?.toLowerCase() === key
      );
      if (found && found.color) return found.color;
    }
    return targetCategory === 'contacts' ? '#6366f1' : '#3b82f6';
  };

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      prevIsOpenRef.current = true;
      setSearchTerm('');
      setSelectedTags(getInitialForCategory(targetCategory));
      if (typeof loadLabelsRef.current === 'function') {
        loadLabelsRef.current();
      }
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 60);
      return () => clearTimeout(timer);
    } else if (!isOpen) {
      prevIsOpenRef.current = false;
    }
  }, [isOpen, selectedBulkTag, customBulkTag, targetCategory, initialChatLabels, initialContactLabels]);

  const currentCategoryLabels = targetCategory === 'chat'
    ? (chatLabels && chatLabels.length > 0 ? chatLabels : availableLabels)
    : (contactLabels && contactLabels.length > 0 ? contactLabels : []);

  const uniqueLabels = (currentCategoryLabels || []).reduce((acc, l) => {
    if (!l) return acc;
    const clean = String(l).trim();
    if (!clean) return acc;
    const key = clean.toLowerCase();
    if (!acc.some(existing => existing.toLowerCase() === key)) {
      acc.push(clean);
    }
    return acc;
  }, []);

  const filteredLabels = uniqueLabels.filter((label) =>
    label.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  const isExactMatch = uniqueLabels.some(
    (l) => l.toLowerCase() === searchTerm.trim().toLowerCase()
  );

  const handleToggleTag = (tag) => {
    const clean = tag.trim();
    if (!clean) return;
    setSelectedTags(prev => {
      const exists = prev.some(t => t.toLowerCase() === clean.toLowerCase());
      let next;
      if (exists) {
        next = prev.filter(t => t.toLowerCase() !== clean.toLowerCase());
      } else {
        next = [...prev, clean];
      }
      if (typeof setSelectedBulkTag === 'function') {
        setSelectedBulkTag(next[0] || '');
      }
      if (typeof setCustomBulkTag === 'function' && next.length === 0) {
        setCustomBulkTag('');
      }
      return next;
    });
    setSearchTerm('');
  };

  const handleOpenCreateModal = (initialName) => {
    const raw = (initialName || searchTerm || '').trim();
    const clean = raw.slice(0, 25);
    if (!clean) return;

    const existing = uniqueLabels.find(l => l.toLowerCase() === clean.toLowerCase());
    if (existing) {
      handleToggleTag(existing);
      return;
    }

    setCreateTagName(clean);
    setCreateTagColor(targetCategory === 'contacts' ? '#6366F1' : '#3B82F6');
    setIsCreateModalOpen(true);
  };

  const handleConfirmCreateLabel = async () => {
    const finalName = createTagName.trim().slice(0, 25);
    if (!finalName) return;

    setIsCreatingLabel(true);
    try {
      if (activeClientId) {
        await fetchWithAuth(`${API_URL}/chat/labels`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: finalName, color: createTagColor })
        }, activeClientId);
      }
    } catch (err) {
      console.error('Erro ao registrar nova etiqueta:', err);
    } finally {
      setIsCreatingLabel(false);
    }

    setCustomColorsMap(prev => ({
      ...prev,
      [finalName.toLowerCase()]: createTagColor
    }));

    if (typeof loadLabelsRef.current === 'function') {
      loadLabelsRef.current();
    }

    setSelectedTags(prev => {
      const exists = prev.some(t => t.toLowerCase() === finalName.toLowerCase());
      if (exists) return prev;
      const next = [...prev, finalName];
      if (typeof setCustomBulkTag === 'function') setCustomBulkTag(finalName);
      if (typeof setSelectedBulkTag === 'function') setSelectedBulkTag(next[0] || '');
      return next;
    });

    setIsCreateModalOpen(false);
    setSearchTerm('');
  };

  const handleRemoveTag = (tagToRemove) => {
    setSelectedTags(prev => {
      const next = prev.filter(t => t.toLowerCase() !== tagToRemove.toLowerCase());
      if (typeof setSelectedBulkTag === 'function') {
        setSelectedBulkTag(next[0] || '');
      }
      if (typeof setCustomBulkTag === 'function' && next.length === 0) {
        setCustomBulkTag('');
      }
      return next;
    });
  };

  const handleClearAllTags = () => {
    setSelectedTags([]);
    if (typeof setSelectedBulkTag === 'function') setSelectedBulkTag('');
    if (typeof setCustomBulkTag === 'function') setCustomBulkTag('');
  };

  const handleSwitchCategory = (category) => {
    setTargetCategory(category);
    setSelectedTags(getInitialForCategory(category));
    setSearchTerm('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredLabels.length > 0 && isExactMatch) {
        handleToggleTag(filteredLabels[0]);
      } else if (searchTerm.trim()) {
        handleOpenCreateModal(searchTerm);
      } else {
        const currentInitialTags = targetCategory === 'contacts' ? initialContactLabels : initialChatLabels;
        const hasInitial = currentInitialTags && currentInitialTags.length > 0;
        if (selectedTags.length > 0 || hasInitial) {
          onApply && onApply(selectedTags, targetCategory, { initialTags: currentInitialTags });
        }
      }
    }
  };

  return {
    targetCategory,
    setTargetCategory,
    searchTerm,
    setSearchTerm,
    selectedTags,
    searchInputRef,
    filteredLabels,
    isExactMatch,
    resolveColor,
    handleToggleTag,
    handleCreateCustomTag: handleOpenCreateModal,
    handleOpenCreateModal,
    handleConfirmCreateLabel,
    isCreateModalOpen,
    setIsCreateModalOpen,
    createTagName,
    setCreateTagName,
    createTagColor,
    setCreateTagColor,
    isCreatingLabel,
    handleRemoveTag,
    handleClearAllTags,
    handleSwitchCategory,
    handleKeyDown
  };
}
