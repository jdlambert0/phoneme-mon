/**
 * useCalibrationProfiles — localStorage-backed voice profiles
 * Lets returning players skip re-calibration
 */
import { useState, useCallback } from 'react';

const STORAGE_KEY = 'phonemon_profiles';
const MAX_PROFILES = 6;

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

function save(profiles) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles)); }
  catch (_) {}
}

export function useCalibrationProfiles() {
  const [profiles, setProfiles] = useState(() => load());

  /** Save a new or updated profile */
  const saveProfile = useCallback(({ title, calibration, personality }) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const profile = { id, title, calibration, personality, lastUsed: new Date().toISOString() };
    setProfiles((prev) => {
      const updated = [profile, ...prev.filter((p) => p.id !== id)].slice(0, MAX_PROFILES);
      save(updated);
      return updated;
    });
    return profile;
  }, []);

  /** Mark profile as recently used */
  const touchProfile = useCallback((id) => {
    setProfiles((prev) => {
      const updated = prev.map((p) => p.id === id ? { ...p, lastUsed: new Date().toISOString() } : p);
      save(updated);
      return updated;
    });
  }, []);

  const deleteProfile = useCallback((id) => {
    setProfiles((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      save(updated);
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setProfiles([]);
  }, []);

  return { profiles, saveProfile, touchProfile, deleteProfile, clearAll };
}
