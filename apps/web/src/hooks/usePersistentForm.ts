import { useEffect, useState } from 'react';

/**
 * Hook to persist form state in localStorage.
 * @param key Unique storage key for the form (e.g., 'seeker-form-<id>').
 * @param defaultValue Initial form state.
 * @returns [form, setForm] where setForm updates both state and storage.
 */
export function usePersistentForm<T extends Record<string, any>>(key: string, defaultValue: T) {
  const [form, setFormState] = useState<T>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          return JSON.parse(stored) as T;
        }
      } catch (e) {
        console.warn('Failed to parse persisted form data', e);
      }
    }
    return defaultValue;
  });

  // Sync to localStorage whenever form changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(form));
      } catch (e) {
        console.warn('Failed to persist form data', e);
      }
    }
  }, [key, form]);

  const setForm = (newForm: Partial<T> | ((prev: T) => T)) => {
    setFormState(prev => {
      const updated = typeof newForm === 'function' ? newForm(prev) : { ...prev, ...newForm };
      return updated;
    });
  };

  const clearForm = () => {
    setFormState(defaultValue);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
  };

  return { form, setForm, clearForm } as const;
}
