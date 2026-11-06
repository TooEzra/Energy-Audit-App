import { useState } from 'react';
import { listBuildings } from '../api/buildings.js';
import { useApi } from './useApi.js';

const KEY = 'ea_selected_building';
const readSaved = () => { try { return Number(sessionStorage.getItem(KEY)) || null; } catch { return null; } };

/** The institution's buildings plus the currently selected one (remembered for the browser session). */
export function useBuildings() {
  const { data, loading, error, reload } = useApi(listBuildings, []);
  const [savedId, setSavedId] = useState(readSaved);
  const buildings = data?.items || [];
  const selected = buildings.find((b) => b.id === savedId) || buildings[0] || null;

  const selectBuilding = (id) => {
    const n = Number(id);
    setSavedId(n);
    try { sessionStorage.setItem(KEY, String(n)); } catch { /* storage unavailable: selection just isn't remembered */ }
  };
  return { buildings, maxBuildings: data?.maxBuildings ?? null, loading, error, reload, selected, selectBuilding };
}
