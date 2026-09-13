import { useState } from 'react';

export function useTriggerHistoryFilters(initialTriggerType = 'bulk') {
    const [triggerType, setTriggerType] = useState(initialTriggerType);
    const [filterName, setFilterName] = useState('');
    const [dateRange, setDateRange] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [showTechnical, setShowTechnical] = useState(false);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [showOnlyPinned, setShowOnlyPinned] = useState(false);
    const [selectedFolderId, setSelectedFolderId] = useState(null);
    const [sortBy, setSortBy] = useState('recent'); // 'recent' ou 'largest'
    const [selectedIds, setSelectedIds] = useState([]);

    return {
        triggerType, setTriggerType,
        filterName, setFilterName,
        dateRange, setDateRange,
        filterStatus, setFilterStatus,
        customStart, setCustomStart,
        customEnd, setCustomEnd,
        showTechnical, setShowTechnical,
        itemsPerPage, setItemsPerPage,
        page, setPage,
        totalPages, setTotalPages,
        totalItems, setTotalItems,
        showOnlyPinned, setShowOnlyPinned,
        selectedFolderId, setSelectedFolderId,
        sortBy, setSortBy,
        selectedIds, setSelectedIds
    };
}
