import { useState } from 'react';

export function useTemplateUIState() {
  const [isBodyExpanded, setIsBodyExpanded] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  return {
    isBodyExpanded,
    setIsBodyExpanded,
    isGuideOpen,
    setIsGuideOpen
  };
}

export default useTemplateUIState;
