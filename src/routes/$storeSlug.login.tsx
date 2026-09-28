// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import { Login } from '../pages/Login';

export const Route = createFileRoute('/$storeSlug/login')({
  head: () => ({
    meta: [
      { title: "Login - Smart PDV PRO" },
      { name: "description", content: "Acesse sua conta no Smart PDV PRO." },
    ],
  }),
  component: Login,
});
