// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import { AutoLogin } from '../pages/AutoLogin';

export const Route = createFileRoute('/autologin')({
  validateSearch: (search: Record<string, unknown>): { token?: string } => {
    return {
      token: (search.token as string) || undefined,
    }
  },
  head: () => ({
    meta: [
      { title: "Acesso Automático - Smart PDV PRO" },
      { name: "description", content: "Validando acesso automático..." },
    ],
  }),
  component: AutoLogin,
});
