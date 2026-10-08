import { useCallback, useEffect, useState } from 'react';
import { PAGE_IDS } from '../types';
import type { PageId } from '../types';

export interface Route {
  page: PageId;
  /** Paramètre optionnel (ex. identifiant d'un budget : #/activities/<id>). */
  param: string | null;
}

function parseHash(): Route {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [page, param] = raw.split('/');
  return {
    page: (PAGE_IDS as string[]).includes(page) ? (page as PageId) : 'dashboard',
    param: param || null,
  };
}

/** Routage par hash : retour arrière du navigateur, liens directs et rechargement conservent la page. */
export function useRoute() {
  const [route, setRoute] = useState<Route>(parseHash);

  useEffect(() => {
    const onChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((page: PageId, param?: string | null) => {
    const next = `#/${page}${param ? `/${param}` : ''}`;
    if (window.location.hash !== next) window.location.hash = next;
    else setRoute(parseHash());
  }, []);

  return { route, navigate };
}
