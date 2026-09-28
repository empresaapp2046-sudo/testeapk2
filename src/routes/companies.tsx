// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import { Companies } from '../pages/Companies';

export const Route = createFileRoute('/companies')({
  head: () => ({
    meta: [
      { title: "Empresas - Smart PDV PRO" },
      { name: "description", content: "Gerencie convênios corporativos e empresas parceiras." },
      { property: "og:title", content: "Empresas - Smart PDV PRO" },
      { property: "og:description", content: "Gerencie convênios corporativos e empresas parceiras." },
    ],
  }),
  component: Companies,
});
