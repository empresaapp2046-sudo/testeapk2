import { createFileRoute } from '@tanstack/react-router';
import { Vitrine } from '../pages/Vitrine';

export const Route = createFileRoute('/$storeSlug/vitrine')({
  head: () => ({
    meta: [
      { title: "Smart PDV PRO - Vitrine da Loja" },
      { name: "description", content: "Vitrine virtual de produtos." },
    ],
  }),
  component: Vitrine,
});
