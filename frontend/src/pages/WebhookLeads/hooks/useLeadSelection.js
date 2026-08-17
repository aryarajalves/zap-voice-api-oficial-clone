import { useState } from 'react';

export function useLeadSelection(leads) {
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [selectAllPages, setSelectAllPages] = useState(false);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedLeads(leads.filter(lead => !lead.is_locked).map(lead => lead.id));
    } else {
      setSelectedLeads([]);
      setSelectAllPages(false);
    }
  };

  const handleSelectAllPages = () => setSelectAllPages(true);
  
  const handleClearSelectAllPages = () => {
    setSelectAllPages(false);
    setSelectedLeads([]);
  };

  const handleSelectLead = (leadId) => {
    const lead = leads.find(l => l.id === leadId);
    if (lead?.is_locked) return;
    setSelectedLeads(prev =>
      prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
    );
  };

  return {
    selectedLeads,
    setSelectedLeads,
    selectAllPages,
    setSelectAllPages,
    handleSelectAll,
    handleSelectLead,
    handleSelectAllPages,
    handleClearSelectAllPages,
  };
}
