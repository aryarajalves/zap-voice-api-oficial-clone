import { useState } from 'react';

export const useBulkScheduling = () => {
    const [scheduledTime, setScheduledTime] = useState("");
    const [maxDispatchTime, setMaxDispatchTime] = useState("");
    const [isDynamicLabel, setIsDynamicLabel] = useState(true);

    // Configurações de Recorrência
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceFrequency, setRecurrenceFrequency] = useState('weekly');
    const [recurrenceDaysOfWeek, setRecurrenceDaysOfWeek] = useState([]);
    const [recurrenceDayOfMonth, setRecurrenceDayOfMonth] = useState("");
    const [recurrenceTime, setRecurrenceTime] = useState("09:00");

    const clearScheduling = () => {
        setScheduledTime("");
    };

    const clearMaxDispatchTime = () => {
        setMaxDispatchTime("");
    };

    return {
        scheduledTime,
        setScheduledTime,
        maxDispatchTime,
        setMaxDispatchTime,
        clearMaxDispatchTime,
        isDynamicLabel,
        setIsDynamicLabel,
        isRecurring,
        setIsRecurring,
        recurrenceFrequency,
        setRecurrenceFrequency,
        recurrenceDaysOfWeek,
        setRecurrenceDaysOfWeek,
        recurrenceDayOfMonth,
        setRecurrenceDayOfMonth,
        recurrenceTime,
        setRecurrenceTime,
        clearScheduling
    };
};

export default useBulkScheduling;
