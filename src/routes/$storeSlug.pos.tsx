// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import { POS } from '../pages/POS';

export const Route = createFileRoute('/$storeSlug/pos')({
  head: () => ({
    meta: [
      { title: "PDV - Smart PDV PRO" },
      { name: "description", content: "Ponto de Venda Smart PDV PRO." },
    ],
  }),
  component: POS,
});
