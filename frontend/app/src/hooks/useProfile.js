import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export function useProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.getMe()
      .then(data => { if (!cancelled) { setProfile(data); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  const update = useCallback(async (data) => {
    const updated = await api.updateProfile(data);
    setProfile(p => ({ ...p, ...updated }));
    return updated;
  }, []);

  return { profile, loading, error, update };
}
