import { useCallback, useState } from 'react';

/** Keep tab screens mounted after first visit so switching tabs stays instant. */
export function useVisitedTabs<T extends string>(initial: T) {
  const [active, setActiveState] = useState<T>(initial);
  const [visited, setVisited] = useState<Set<T>>(() => new Set([initial]));

  const markVisited = useCallback((id: T) => {
    setVisited((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const select = useCallback(
    (id: T) => {
      markVisited(id);
      setActiveState(id);
    },
    [markVisited],
  );

  const setActive = useCallback(
    (id: T) => {
      markVisited(id);
      setActiveState(id);
    },
    [markVisited],
  );

  return { active, visited, select, setActive };
}
