// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import { Inventory } from '../pages/Inventory';

export const Route = createFileRoute('/$storeSlug/customers')({
  head: () => ({
    meta: [
      { title: "Clientes - Smart PDV PRO" },
      { name: "description", content: "Gestão de Clientes Smart PDV PRO." },
    ],
  }),
  component: () => <Inventory initialTab="customers" />,
});
