import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export function useOrg() {
  const { orgId } = useAuth();
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    api.getOrg()
      .then(data => { if (!cancelled) { setOrg(data); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [orgId]);

  const update = useCallback(async (data) => {
    const updated = await api.updateOrg(data);
    setOrg(o => ({ ...o, ...updated }));
    return updated;
  }, []);

  return { org, loading, error, update };
}
