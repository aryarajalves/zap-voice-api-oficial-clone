/**
 * Helper to calculate and format remaining time until an appointment event.
 * @param {string} eventDateStr - ISO date string of the scheduled event
 * @param {Date} now - Current Date instance
 * @returns {{ text: string, type: 'expired' | 'future' | 'warning' | 'danger' }}
 */
export function getRemainingTime(eventDateStr, now = new Date()) {
  if (!eventDateStr) return { text: 'Sem data', type: 'expired' };
  const eventDate = new Date(eventDateStr);
  const diffMs = eventDate - now;

  if (diffMs <= 0) {
    return { text: 'Realizado / Ocorrido', type: 'expired' };
  }

  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return { 
      text: `Falta(m) ${diffDays}d ${diffHours % 24}h ${diffMins % 60}m`, 
      type: 'future' 
    };
  }

  if (diffHours > 0) {
    return { 
      text: `Falta(m) ${diffHours}h ${diffMins % 60}m ${diffSecs % 60}s`, 
      type: 'warning' 
    };
  }

  return { 
    text: `Urgente! Falta(m) ${diffMins}m ${diffSecs % 60}s`, 
    type: 'danger' 
  };
}
