import { createFileRoute } from '@tanstack/react-router';
import { Vitrine } from '../pages/Vitrine';

export const Route = createFileRoute('/l/$storeSlug')({
  head: () => ({
    meta: [
      { title: "Smart PDV PRO - Loja" },
      { name: "description", content: "Vitrine virtual." },
    ],
  }),
  component: Vitrine,
});
