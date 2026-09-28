// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import { CashReports } from '../pages/CashReports';

export const Route = createFileRoute('/cash-reports')({
  head: () => ({
    meta: [
      { title: "Relatórios de Caixa - Smart PDV PRO" },
      { name: "description", content: "Acompanhe aberturas e fechamentos de caixa." },
      { property: "og:title", content: "Relatórios de Caixa - Smart PDV PRO" },
      { property: "og:description", content: "Acompanhe aberturas e fechamentos de caixa." },
    ],
  }),
  component: CashReports,
});
