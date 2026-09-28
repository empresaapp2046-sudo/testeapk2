// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import { CorporateReports } from '../pages/CorporateReports';

export const Route = createFileRoute('/corporate-reports')({
  head: () => ({
    meta: [
      { title: "Relatórios Empresariais - Smart PDV PRO" },
      { name: "description", content: "Visão estratégica para parceiros corporativos." },
      { property: "og:title", content: "Relatórios Empresariais - Smart PDV PRO" },
      { property: "og:description", content: "Visão estratégica para parceiros corporativos." },
    ],
  }),
  component: CorporateReports,
});
