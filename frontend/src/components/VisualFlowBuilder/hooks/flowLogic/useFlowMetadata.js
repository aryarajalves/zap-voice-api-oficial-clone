import { useState } from 'react';

export const useFlowMetadata = () => {
    // Funnel Metadata State
    const [funnelName, setFunnelName] = useState('');
    const [allowedPhones, setAllowedPhones] = useState('');
    const [blockedPhones, setBlockedPhones] = useState('');
    const [showRestrictions, setShowRestrictions] = useState(false);

    // Keyword Trigger State
    const [triggerPhrase, setTriggerPhrase] = useState('');
    const [triggerMatchType, setTriggerMatchType] = useState('contains');
    const [triggerLimitType, setTriggerLimitType] = useState('none');
    const [isTriggerActive, setIsTriggerActive] = useState(true);
    const [showKeywords, setShowKeywords] = useState(false);

    // Business Hours State
    const [businessHoursStart, setBusinessHoursStart] = useState('08:00');
    const [businessHoursEnd, setBusinessHoursEnd] = useState('18:00');
    const [businessHoursDays, setBusinessHoursDays] = useState([0, 1, 2, 3, 4]);
    const [showBusinessHours, setShowBusinessHours] = useState(false);

    return {
        funnelName, setFunnelName,
        allowedPhones, setAllowedPhones,
        blockedPhones, setBlockedPhones,
        showRestrictions, setShowRestrictions,
        triggerPhrase, setTriggerPhrase,
        triggerMatchType, setTriggerMatchType,
        triggerLimitType, setTriggerLimitType,
        isTriggerActive, setIsTriggerActive,
        showKeywords, setShowKeywords,
        businessHoursStart, setBusinessHoursStart,
        businessHoursEnd, setBusinessHoursEnd,
        businessHoursDays, setBusinessHoursDays,
        showBusinessHours, setShowBusinessHours
    };
};
