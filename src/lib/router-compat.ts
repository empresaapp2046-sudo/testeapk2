// @ts-nocheck
// Compat layer: react-router-dom style hooks backed by TanStack Router
import {
  useNavigate as useTanstackNavigate,
  useLocation as useTanstackLocation,
  useParams as useTanstackParams,
  Link as TanStackLink,
} from '@tanstack/react-router';

export const useNavigate = () => {
  const navigate = useTanstackNavigate();
  return (to: string | number, options?: { state?: any; replace?: boolean }) => {
    if (typeof to === 'number') {
      if (typeof window !== 'undefined') window.history.go(to);
      return;
    }
    return navigate({ to, state: options?.state, replace: options?.replace } as any);
  };
};

export const useLocation = () => {
  const loc = useTanstackLocation();
  return { ...loc, state: (loc as any).state || {} };
};

export const useParams = () => {
  try {
    return useTanstackParams({ strict: false }) as any;
  } catch {
    return {} as any;
  }
};

export const Link = TanStackLink;
