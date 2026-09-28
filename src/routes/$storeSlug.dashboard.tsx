// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import { Dashboard } from '../pages/Dashboard';

export const Route = createFileRoute('/$storeSlug/dashboard')({
  head: () => ({
    meta: [
      { title: "Dashboard - Smart PDV PRO" },
      { name: "description", content: "Visão geral do seu negócio no Smart PDV PRO." },
    ],
  }),
  component: Dashboard,
});
