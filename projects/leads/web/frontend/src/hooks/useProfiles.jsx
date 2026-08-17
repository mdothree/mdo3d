/**
 * Hook for managing lead profiles
 */

import { useState, useEffect, useCallback } from 'react';
import { listProfiles, createProfile, updateProfile, deleteProfile } from '../lib/api';

export function useProfiles() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listProfiles();
      setProfiles(data.profiles || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const create = async (data) => {
    const result = await createProfile(data);
    await fetchProfiles();
    return result;
  };

  const update = async (profileId, data) => {
    const result = await updateProfile(profileId, data);
    await fetchProfiles();
    return result;
  };

  const remove = async (profileId) => {
    const result = await deleteProfile(profileId);
    await fetchProfiles();
    return result;
  };

  return {
    profiles,
    loading,
    error,
    refetch: fetchProfiles,
    createProfile: create,
    updateProfile: update,
    deleteProfile: remove,
  };
}
