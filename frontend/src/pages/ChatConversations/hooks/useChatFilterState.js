import React, { useState } from 'react';

export function useChatFilterState() {
    const [selectedConvo, setSelectedConvo] = useState(null);
    const [activeTab, setActiveTab] = useState('todos');
    const [statusFilter, setStatusFilter] = useState('open');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLabelFilter, setSelectedLabelFilter] = useState(null);
    const [filterWindowOpen, setFilterWindowOpen] = useState(false);
    const [filterTemplate24h, setFilterTemplate24h] = useState(false);
    const [filterUnread, setFilterUnread] = useState(false);
    const [filterHasNote, setFilterHasNote] = useState(false);
    const [filterUrgent, setFilterUrgent] = useState(false);
    const [filterHasReplied, setFilterHasReplied] = useState(false);
    const [filterHasActiveFunnel, setFilterHasActiveFunnel] = useState(false);
    const [filterBlockStatus, setFilterBlockStatus] = useState(null);
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [orderBy, setOrderBy] = useState('recent');
    const [activeFilterTab, setActiveFilterTab] = useState(null);
    const [selectAllPages, setSelectAllPages] = useState(false);

    return {
        selectedConvo, setSelectedConvo,
        activeTab, setActiveTab,
        statusFilter, setStatusFilter,
        searchQuery, setSearchQuery,
        selectedLabelFilter, setSelectedLabelFilter,
        filterWindowOpen, setFilterWindowOpen,
        filterTemplate24h, setFilterTemplate24h,
        filterUnread, setFilterUnread,
        filterHasNote, setFilterHasNote,
        filterUrgent, setFilterUrgent,
        filterHasReplied, setFilterHasReplied,
        filterHasActiveFunnel, setFilterHasActiveFunnel,
        filterBlockStatus, setFilterBlockStatus,
        filterStartDate, setFilterStartDate,
        filterEndDate, setFilterEndDate,
        orderBy, setOrderBy,
        activeFilterTab, setActiveFilterTab,
        selectAllPages, setSelectAllPages
    };
}
