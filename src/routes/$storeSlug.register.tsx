import { createFileRoute } from '@tanstack/react-router';
import { Login } from '../pages/Login';

export const Route = createFileRoute('/$storeSlug/register')({
  head: () => ({
    meta: [
      { title: "Smart PDV PRO - Cadastro na Loja" },
      { name: "description", content: "Crie sua conta na nossa loja." },
    ],
  }),
  component: Login,
});
