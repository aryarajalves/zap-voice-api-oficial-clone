import { useMemo } from 'react';
import { HEADER_VAR_OPTIONS, BODY_VAR_OPTIONS } from '../../../../constants';

export function useFollowUpOptions({
  mapping = {},
  templates = [],
  followupTemplateVars = [],
  customFieldsMapping = {}
}) {
  const isActive = Boolean(mapping.followup_active);

  const selectedTemplate = useMemo(() => {
    return templates.find(
      t => t.id === mapping.followup_template_id || String(t.id) === String(mapping.followup_template_id)
    );
  }, [templates, mapping.followup_template_id]);

  const hasVars = followupTemplateVars && followupTemplateVars.length > 0;
  const headerComp = selectedTemplate?.components?.find(c => c.type === 'HEADER');
  const hasMedia = headerComp && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerComp.format);
  const buttonsComp = selectedTemplate?.components?.find(c => c.type === 'BUTTONS');
  const hasDynamicButtons = buttonsComp && buttonsComp.buttons?.some(b => 
    b.type === 'URL' && b.url && b.url.includes('{{')
  );
  const needsConfig = Boolean(hasVars || hasMedia || hasDynamicButtons);

  const { dynamicBodyOptions, dynamicHeaderOptions } = useMemo(() => {
    const customOptions = Object.keys(customFieldsMapping || {}).map(key => ({
      value: key,
      label: `Personalizado: {{${key}}}`
    }));

    const getDynamicOptions = (baseOptions) => {
      const options = [...baseOptions];
      const customIdx = options.findIndex(opt => opt.value === 'custom');
      if (customIdx !== -1) {
        options.splice(customIdx, 0, ...customOptions);
      } else {
        options.push(...customOptions);
      }
      return options;
    };

    return {
      dynamicBodyOptions: getDynamicOptions(BODY_VAR_OPTIONS),
      dynamicHeaderOptions: getDynamicOptions(HEADER_VAR_OPTIONS)
    };
  }, [customFieldsMapping]);

  return {
    isActive,
    selectedTemplate,
    needsConfig,
    dynamicBodyOptions,
    dynamicHeaderOptions
  };
}
