import React from 'react';
import { TUTORIALS } from './TutorialPage/constants/tutorialsData';
import { useTutorialPage } from './TutorialPage/hooks/useTutorialPage';
import TutorialHeaderBanner from './TutorialPage/components/TutorialHeaderBanner';
import TutorialCard from './TutorialPage/components/TutorialCard';
import TutorialDetailView from './TutorialPage/components/TutorialDetailView';

export default function TutorialPage() {
  const {
    selectedTutorial,
    setSelectedTutorial,
    copiedId,
    handleCopyLink,
    handleOpenNewTab
  } = useTutorialPage();

  if (selectedTutorial) {
    const tutorial = TUTORIALS.find((t) => t.id === selectedTutorial);
    if (!tutorial) return null;

    return (
      <TutorialDetailView
        tutorial={tutorial}
        copiedId={copiedId}
        onBack={() => setSelectedTutorial(null)}
        onCopyLink={handleCopyLink}
        onOpenNewTab={handleOpenNewTab}
      />
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans">
      {/* Banner */}
      <TutorialHeaderBanner />

      {/* Grid de Cards de Tutoriais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {TUTORIALS.map((tutorial) => (
          <TutorialCard
            key={tutorial.id}
            tutorial={tutorial}
            copiedId={copiedId}
            onSelect={setSelectedTutorial}
            onCopyLink={handleCopyLink}
            onOpenNewTab={handleOpenNewTab}
          />
        ))}
      </div>
    </div>
  );
}
