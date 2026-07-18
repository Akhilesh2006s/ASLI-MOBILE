import { useEffect, useState } from 'react';
import authService from '../services/api/authService';
import {
  getAllowedContentTypes,
  getLibraryTilesForProgram,
  resolveIsAsliPrepExclusive,
  type ContentTypeName,
} from '../lib/school-program';

export function useSchoolProgram() {
  const [isAsliPrepExclusive, setIsAsliPrepExclusive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    authService
      .me()
      .then((data) => {
        if (!mounted) return;
        setIsAsliPrepExclusive(resolveIsAsliPrepExclusive(data?.user));
      })
      .catch(() => {
        if (mounted) setIsAsliPrepExclusive(false);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const allowedContentTypes = getAllowedContentTypes(isAsliPrepExclusive);
  const libraryTiles = getLibraryTilesForProgram(isAsliPrepExclusive);

  return {
    isAsliPrepExclusive,
    loading,
    allowedContentTypes,
    libraryTiles,
    isTypeAllowed: (type: string | undefined) =>
      allowedContentTypes.includes(String(type || '').trim() as ContentTypeName),
  };
}
