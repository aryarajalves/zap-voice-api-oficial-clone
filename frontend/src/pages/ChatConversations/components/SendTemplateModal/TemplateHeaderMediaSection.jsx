import React from 'react';
import MediaHeaderUploader from '../../../../components/BulkSender/common/MediaHeaderUploader';

export default function TemplateHeaderMediaSection({
  selectedTemplate,
  templateParams,
  handleParamChange
}) {
  const headerComp = selectedTemplate?.components?.find(
    c => (c.type || '').toUpperCase() === 'HEADER'
  );
  const format = (headerComp?.format || '').toUpperCase();

  if (!['IMAGE', 'VIDEO', 'DOCUMENT'].includes(format)) return null;

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <MediaHeaderUploader
        format={format}
        templateParams={templateParams}
        handleParamChange={handleParamChange}
      />
    </div>
  );
}
