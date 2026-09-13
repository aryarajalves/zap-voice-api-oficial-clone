import { useState, useEffect, useRef } from 'react';

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
  loadAvailableLabels
}) {
  const [targetCategory, setTargetCategory] = useState('chat'); // 'chat' | 'contacts'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState(() => {
    const initial = [];
    if (selectedBulkTag && selectedBulkTag.trim()) initial.push(selectedBulkTag.trim());
    if (customBulkTag && customBulkTag.trim() && !initial.includes(customBulkTag.trim())) {
      initial.push(customBulkTag.trim());
    }
    return initial;
  });

  const searchInputRef = useRef(null);
  const prevIsOpenRef = useRef(false);
  const loadLabelsRef = useRef(loadAvailableLabels);
  loadLabelsRef.current = loadAvailableLabels;

  const resolveColor = (label) => {
    if (typeof getLabelColor === 'function') {
      return getLabelColor(label);
    }
    if (Array.isArray(availableLabelsDetails)) {
      const found = availableLabelsDetails.find(
        (l) => l.name?.toLowerCase() === label?.toLowerCase()
      );
      if (found && found.color) return found.color;
    }
    return targetCategory === 'contacts' ? '#6366f1' : '#3b82f6';
  };

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      prevIsOpenRef.current = true;
      setSearchTerm('');
      setSelectedTags(() => {
        const initial = [];
        if (selectedBulkTag && selectedBulkTag.trim()) initial.push(selectedBulkTag.trim());
        if (customBulkTag && customBulkTag.trim() && !initial.includes(customBulkTag.trim())) {
          initial.push(customBulkTag.trim());
        }
        return initial;
      });
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
  }, [isOpen, selectedBulkTag, customBulkTag]);

  const currentCategoryLabels = targetCategory === 'chat'
    ? (chatLabels && chatLabels.length > 0 ? chatLabels : availableLabels)
    : (contactLabels && contactLabels.length > 0 ? contactLabels : []);

  const uniqueLabels = Array.from(new Set((currentCategoryLabels || []).filter(Boolean)));
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

  const handleCreateCustomTag = (tag) => {
    const clean = tag.trim();
    if (!clean) return;
    setSelectedTags(prev => {
      const exists = prev.some(t => t.toLowerCase() === clean.toLowerCase());
      if (exists) return prev;
      const next = [...prev, clean];
      if (typeof setCustomBulkTag === 'function') {
        setCustomBulkTag(clean);
      }
      return next;
    });
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
    handleClearAllTags();
    setSearchTerm('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredLabels.length > 0) {
        handleToggleTag(filteredLabels[0]);
      } else if (searchTerm.trim()) {
        handleCreateCustomTag(searchTerm);
      } else if (selectedTags.length > 0) {
        onApply && onApply(selectedTags, targetCategory);
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
    handleCreateCustomTag,
    handleRemoveTag,
    handleClearAllTags,
    handleSwitchCategory,
    handleKeyDown
  };
}
