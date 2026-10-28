'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/context/AuthContext';

/**
 * Storage key used to persist the active MSHA Mine ID in browser localStorage.
 */
const LOCAL_STORAGE_MINE_KEY = 'active_msha_mine_id';

/**
 * Definition for each supported MSHA Mine Site option.
 */
export interface MineOption {
  id: string;
  name: string;
  label: string;
  location?: string;
  firestoreDocId?: string;
  active?: boolean;
}

/**
 * Default fallback list of available MSHA Mine Sites when no mines exist in Firestore yet.
 */
export const MINE_OPTIONS: MineOption[] = [
  {
    id: '13-00123',
    name: 'North Pit',
    label: 'North Pit (13-00123)',
    location: 'Primary Surface Operations',
    active: true,
  },
  {
    id: '13-00456',
    name: 'South Quarry',
    label: 'South Quarry (13-00456)',
    location: 'South Basin Aggregate Site',
    active: true,
  },
];

/**
 * Lookup dictionary mapping MSHA Mine IDs to their display labels.
 */
export const MINE_LABELS_BY_ID: Record<string, string> = {
  '13-00123': 'North Pit (13-00123)',
  '13-00456': 'South Quarry (13-00456)',
};

interface MineContextValue {
  /** Currently active MSHA Mine ID (e.g., "13-00123") */
  selectedMineId: string;
  /** Short name of the active mine (e.g., "North Pit") */
  selectedMineName: string;
  /** Full display label of the active mine (e.g., "North Pit (13-00123)") */
  selectedMineLabel: string;
  /** Function to update the active MSHA Mine ID globally and persist to localStorage */
  setSelectedMineId: (mineId: string) => void;
  /** List of all available MSHA Mine Site options (live from Firestore or fallback defaults) */
  mineOptions: MineOption[];
}

const MineContext = createContext<MineContextValue | undefined>(undefined);

/**
 * Global provider that manages the active MSHA Mine Site across the entire application.
 * Subscribes in real time to collection("mines") scoped by companyId, falling back
 * to North Pit (13-00123) and South Quarry (13-00456) when no mines exist in Firestore.
 */
export function MineProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [selectedMineId, setSelectedMineIdState] = useState<string>('13-00123');
  const [mineOptions, setMineOptions] = useState<MineOption[]>(MINE_OPTIONS);

  const activeCompanyId = profile?.companyId || 'comp_test_001';

  // Load saved mine selection from localStorage on initial client mount
  useEffect(() => {
    try {
      const savedMineId = window.localStorage.getItem(LOCAL_STORAGE_MINE_KEY);
      if (savedMineId && savedMineId.trim()) {
        setSelectedMineIdState(savedMineId.trim());
      }
    } catch (error) {
      console.error('Error reading active MSHA mine ID from localStorage:', error);
    }
  }, []);

  // Listen in real time to collection("mines") where companyId == profile.companyId
  useEffect(() => {
    if (!db || !activeCompanyId) return;

    let unsubscribe: (() => void) | undefined;

    try {
      const minesQuery = query(
        collection(db, 'mines'),
        where('companyId', '==', activeCompanyId)
      );

      unsubscribe = onSnapshot(
        minesQuery,
        (snapshot) => {
          try {
            const fetchedMines: MineOption[] = [];

            snapshot.docs.forEach((docSnap) => {
              const data = docSnap.data();
              // Exclude deactivated mine records from active selector options
              if (
                data.active === false ||
                String(data.status || '').toLowerCase() === 'inactive'
              ) {
                return;
              }

              const mineId = String(
                data.mshaMineId || data.mineId || data.id || docSnap.id
              ).trim();
              const mineName = String(
                data.mineName || data.name || mineId
              ).trim();

              if (!mineId) return;

              fetchedMines.push({
                id: mineId,
                name: mineName,
                label: `${mineName} (${mineId})`,
                location: data.state || data.location || data.stateLocation || '',
                firestoreDocId: docSnap.id,
                active: data.active !== false && String(data.status || 'Active').toLowerCase() !== 'inactive',
              });
            });

            if (fetchedMines.length > 0) {
              // Sort alphabetically by mine name for consistent dropdown order
              fetchedMines.sort((a, b) => a.name.localeCompare(b.name));
              setMineOptions(fetchedMines);
            } else {
              // Default gracefully to existing fallback options if no active mines exist in Firestore
              setMineOptions(MINE_OPTIONS);
            }
          } catch (parseError) {
            console.error('Error parsing mines snapshot:', parseError);
            setMineOptions(MINE_OPTIONS);
          }
        },
        (error) => {
          console.error('Error in mines collection onSnapshot listener:', error);
          setMineOptions(MINE_OPTIONS);
        }
      );
    } catch (error) {
      console.error('Error setting up mines collection listener:', error);
      setMineOptions(MINE_OPTIONS);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [activeCompanyId]);

  // Update state and persist selection to localStorage
  const setSelectedMineId = (mineId: string) => {
    setSelectedMineIdState(mineId);
    try {
      window.localStorage.setItem(LOCAL_STORAGE_MINE_KEY, mineId);
    } catch (error) {
      console.error('Error saving active MSHA mine ID to localStorage:', error);
    }
  };

  const matchedMine =
    mineOptions.find((m) => m.id === selectedMineId) ||
    mineOptions[0] ||
    MINE_OPTIONS[0];

  const value: MineContextValue = {
    selectedMineId: matchedMine.id,
    selectedMineName: matchedMine.name,
    selectedMineLabel: matchedMine.label,
    setSelectedMineId,
    mineOptions,
  };

  return <MineContext.Provider value={value}>{children}</MineContext.Provider>;
}

/**
 * Custom hook to access and update the global Active Mine Site state.
 */
export function useActiveMine(): MineContextValue {
  const context = useContext(MineContext);
  if (!context) {
    throw new Error('useActiveMine must be used within a MineProvider');
  }
  return context;
}
