// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import { AdminDashboard } from '../pages/AdminDashboard';

export const Route = createFileRoute('/admin')({
  head: () => ({
    meta: [
      { title: "Administração Geral - Smart PDV PRO" },
      { name: "description", content: "Painel de controle administrativo global." },
      { property: "og:title", content: "Administração Geral - Smart PDV PRO" },
      { property: "og:description", content: "Painel de controle administrativo global." },
    ],
  }),
  component: AdminDashboard,
});
