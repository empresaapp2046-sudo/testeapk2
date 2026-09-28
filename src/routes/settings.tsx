// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import { Settings } from '../pages/Settings';

export const Route = createFileRoute('/settings')({
  head: () => ({
    meta: [
      { title: "Configurações - Smart PDV PRO" },
      { name: "description", content: "Configurações do sistema." },
    ],
  }),
  component: Settings,
});

