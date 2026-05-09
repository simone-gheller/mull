import { useState, useEffect, useCallback } from 'react';
import apiService from '../services/api';

export function useInvites() {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getInvites();
      setInvites(data);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load invites');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const sendInvite = async ({ email, role }) => {
    const result = await apiService.sendInvite({ email, role });
    await fetch();
    return result;
  };

  const revokeInvite = async (id) => {
    await apiService.revokeInvite(id);
    setInvites(prev => prev.filter(inv => inv.id !== id));
  };

  return { invites, loading, error, sendInvite, revokeInvite };
}
