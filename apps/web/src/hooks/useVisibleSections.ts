'use client';

import { useEffect, useState } from 'react';
import { getVisibleSections } from '@/lib/visibilityManager';

export function useVisibleSections(
  department: string,
  collectionName: string,
  entityId: string
): {
  sections: Record<string, boolean>;
  loading: boolean;
} {
  const [sections, setSections] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!entityId || !department || !collectionName) {
      setLoading(false);
      return;
    }
    
    async function load() {
      try {
        setLoading(true);
        const data = await getVisibleSections(department, collectionName, entityId);
        if (active) {
          setSections(data);
        }
      } catch (err) {
        console.error('Failed to load visible sections:', err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    
    void load();
    return () => {
      active = false;
    };
  }, [department, collectionName, entityId]);

  return { sections, loading };
}
