// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import { Payables } from '../pages/Payables';

export const Route = createFileRoute('/payables')({
  head: () => ({
    meta: [
      { title: "Contas a Pagar - Smart PDV PRO" },
      { name: "description", content: "Gerencie suas contas a pagar e compromissos financeiros." },
      { property: "og:title", content: "Contas a Pagar - Smart PDV PRO" },
      { property: "og:description", content: "Gerencie suas contas a pagar e compromissos financeiros." },
    ],
  }),
  component: Payables,
});
