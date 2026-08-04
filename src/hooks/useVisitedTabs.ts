import { useCallback, useMemo, useState } from 'react';

type Options = {
  /** When set, only the most recently used tabs stay mounted (LRU). */
  maxVisited?: number;
};

/** Keep tab screens mounted after first visit so switching tabs stays instant. */
export function useVisitedTabs<T extends string>(initial: T, options?: Options) {
  const maxVisited = options?.maxVisited;
  const [active, setActiveState] = useState<T>(initial);
  /** Oldest → newest; used for LRU eviction when maxVisited is set. */
  const [order, setOrder] = useState<T[]>([initial]);

  const visited = useMemo(() => new Set(order), [order]);

  const markVisited = useCallback(
    (id: T) => {
      setOrder((prev) => {
        const next = [...prev.filter((x) => x !== id), id];
        if (maxVisited && next.length > maxVisited) {
          return next.slice(next.length - maxVisited);
        }
        return next;
      });
    },
    [maxVisited],
  );

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
