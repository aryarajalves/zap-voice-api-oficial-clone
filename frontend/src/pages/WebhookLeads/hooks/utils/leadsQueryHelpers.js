import { resolveDateRange } from './dateRangeResolver';

/**
 * Constrói a query string completa para consulta ou exportação de leads.
 */
export function buildLeadsQueryParams(filters) {
  const {
    skip,
    limit,
    search,
    eventType,
    importedByClientId,
    origin,
    lockedFilter,
    bsudFilter,
    filterDdi,
    filterDdd,
    blockStatusFilter,
    selectedTags,
    tagMode,
    excludedTags,
    datePreset,
    customDateFrom,
    customDateTo,
    interactionPreset,
    customInteractionFrom,
    customInteractionTo,
    selectedLeads,
    selectAllPages
  } = filters;

  const { from, to } = resolveDateRange(datePreset, customDateFrom, customDateTo);
  const params = [];

  if (skip !== undefined) params.push(`skip=${skip}`);
  if (limit !== undefined) params.push(`limit=${limit}`);

  if (selectedLeads && selectedLeads.length > 0 && !selectAllPages) {
    params.push(`ids=${selectedLeads.join(',')}`);
  } else {
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    if (eventType) params.push(`event_type=${encodeURIComponent(eventType)}`);
    if (importedByClientId) params.push(`imported_by_client_id=${importedByClientId}`);
    if (origin) params.push(`origin=${encodeURIComponent(origin)}`);
    if (lockedFilter !== '' && lockedFilter !== undefined && lockedFilter !== null) {
      params.push(`is_locked=${lockedFilter}`);
    }
    if (bsudFilter !== '' && bsudFilter !== undefined && bsudFilter !== null) {
      params.push(`has_bsud=${bsudFilter}`);
    }
    if (filterDdi) params.push(`filter_ddi=${encodeURIComponent(filterDdi)}`);
    if (filterDdd) params.push(`filter_ddd=${encodeURIComponent(filterDdd)}`);
    if (blockStatusFilter) params.push(`block_status=${encodeURIComponent(blockStatusFilter)}`);

    if (selectedTags && selectedTags.length > 0) {
      selectedTags.forEach(t => params.push(`tag=${encodeURIComponent(t)}`));
      if (tagMode) {
        params.push(`tag_mode=${encodeURIComponent(tagMode)}`);
      }
    }
    if (excludedTags && excludedTags.length > 0) {
      excludedTags.forEach(t => params.push(`exclude_tag=${encodeURIComponent(t)}`));
    }
    if (from) params.push(`date_from=${from}`);
    if (to) params.push(`date_to=${to}`);

    if (interactionPreset) {
      params.push(`interaction_preset=${encodeURIComponent(interactionPreset)}`);
      if (interactionPreset === 'custom') {
        if (customInteractionFrom) params.push(`interaction_from=${encodeURIComponent(customInteractionFrom)}`);
        if (customInteractionTo) params.push(`interaction_to=${encodeURIComponent(customInteractionTo)}`);
      }
    }
  }

  return params.join('&');
}

/**
 * Constrói o payload JSON com os filtros ativos para endpoints que operam em "todas as páginas"
 */
export function buildCommonFilterPayload(filters) {
  const {
    search,
    eventType,
    selectedTags,
    tagMode,
    excludedTags,
    datePreset,
    customDateFrom,
    customDateTo,
    interactionPreset,
    customInteractionFrom,
    customInteractionTo,
    importedByClientId,
    origin,
    lockedFilter,
    bsudFilter,
    filterDdi,
    filterDdd
  } = filters;

  const { from, to } = resolveDateRange(datePreset, customDateFrom, customDateTo);

  return {
    search: search || null,
    event_type: eventType || null,
    tag: selectedTags?.length > 0 ? selectedTags : null,
    tag_filter: selectedTags?.length > 0 ? selectedTags : null,
    tag_mode: tagMode || 'OR',
    exclude_tag: excludedTags?.length > 0 ? excludedTags : null,
    date_from: from || null,
    date_to: to || null,
    interaction_preset: interactionPreset || null,
    interaction_from: (interactionPreset === 'custom' && customInteractionFrom) ? customInteractionFrom : null,
    interaction_to: (interactionPreset === 'custom' && customInteractionTo) ? customInteractionTo : null,
    importedByClientId: importedByClientId || null,
    origin: origin || null,
    is_locked: (lockedFilter !== '' && lockedFilter !== undefined && lockedFilter !== null) ? lockedFilter : null,
    has_bsud: (bsudFilter !== '' && bsudFilter !== undefined && bsudFilter !== null) ? bsudFilter : null,
    filter_ddi: filterDdi || null,
    filter_ddd: filterDdd || null,
  };
}
