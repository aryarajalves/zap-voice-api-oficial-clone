import React from 'react';
import ManyChatSection from '../ManyChatSection';
import SmartCancelSection from '../SmartCancelSection';
import FollowUpSection from '../FollowUpSection';

export default function AdvancedTabContent({
  mapping,
  mIndex,
  updateMapping,
  templates,
  followupTemplateVars,
  addFollowupVariable,
  removeFollowupVariable,
  updateFollowupVariable,
  customFieldsMapping,
}) {
  return (
    <div className="p-5 space-y-4">
      <ManyChatSection mapping={mapping} mIndex={mIndex} updateMapping={updateMapping} />
      <SmartCancelSection mapping={mapping} mIndex={mIndex} updateMapping={updateMapping} />
      <FollowUpSection
        mapping={mapping}
        mIndex={mIndex}
        updateMapping={updateMapping}
        templates={templates}
        followupTemplateVars={followupTemplateVars}
        addFollowupVariable={addFollowupVariable}
        removeFollowupVariable={removeFollowupVariable}
        updateFollowupVariable={updateFollowupVariable}
        customFieldsMapping={customFieldsMapping}
      />
    </div>
  );
}
