// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import { Inventory } from '../pages/Inventory';

export const Route = createFileRoute('/inventory')({
  head: () => ({
    meta: [
      { title: "Estoque - Smart PDV PRO" },
      { name: "description", content: "Gestão de estoque e produtos." },
    ],
  }),
  component: Inventory,
});

