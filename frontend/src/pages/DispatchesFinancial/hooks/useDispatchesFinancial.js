import { useState, useEffect, useCallback, useMemo } from 'react';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';

export function useDispatchesFinancial(activeClient) {
  const [period, setPeriod] = useState('monthly');
  const [source, setSource] = useState('all');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchData = useCallback(async () => {
    if (!activeClient) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(
        `${API_URL}/financial/summary?period=${period}&source=${source}`,
        {},
        activeClient.id
      );
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [activeClient, period, source]);

  useEffect(() => {
    fetchData();
    setCurrentPage(1);
  }, [fetchData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);

  const totals = data?.totals || null;

  const freeRatio = useMemo(() => {
    if (totals && totals.total_sent > 0) {
      return Math.round((totals.free_sent / totals.total_sent) * 100);
    }
    return 0;
  }, [totals]);

  const visibleRows = useMemo(() => {
    if (!data?.rows) return [];
    return data.rows.filter((r) => r.total_sent > 0);
  }, [data]);

  const totalPages = useMemo(() => {
    return Math.ceil(visibleRows.length / pageSize) || 1;
  }, [visibleRows.length, pageSize]);

  const safeCurrentPage = useMemo(() => {
    return Math.min(currentPage, totalPages) || 1;
  }, [currentPage, totalPages]);

  const pageRows = useMemo(() => {
    return visibleRows.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);
  }, [visibleRows, safeCurrentPage, pageSize]);

  const handleSourceChange = (newSource) => {
    setSource(newSource);
    setCurrentPage(1);
  };

  return {
    period,
    setPeriod,
    source,
    setSource: handleSourceChange,
    data,
    totals,
    freeRatio,
    loading,
    error,
    pageSize,
    setPageSize,
    currentPage: safeCurrentPage,
    setCurrentPage,
    totalPages,
    visibleRows,
    pageRows,
    fetchData
  };
}

export default useDispatchesFinancial;
