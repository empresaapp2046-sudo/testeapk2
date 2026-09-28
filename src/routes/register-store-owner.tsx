// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import { RegisterStoreOwner } from '../pages/RegisterStoreOwner';

export const Route = createFileRoute('/register-store-owner')({
  validateSearch: (search: Record<string, unknown>): { token?: string } => {
    return {
      token: (search.token as string) || undefined,
    }
  },
  head: () => ({
    meta: [
      { title: "Cadastro de Lojista - Smart PDV PRO" },
      { name: "description", content: "Crie sua conta e comece a gerenciar seu negócio." },
      { property: "og:title", content: "Cadastro de Lojista - Smart PDV PRO" },
      { property: "og:description", content: "Crie sua conta e comece a gerenciar seu negócio." },
    ],
  }),
  component: RegisterStoreOwner,
});

