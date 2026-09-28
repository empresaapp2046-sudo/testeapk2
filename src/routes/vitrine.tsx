import { createFileRoute } from '@tanstack/react-router';
import { Vitrine } from '../pages/Vitrine';

export const Route = createFileRoute('/vitrine')({
  head: () => ({
    meta: [
      { title: "Vitrine Admin - Smart PDV PRO" },
      { name: "description", content: "Vitrine virtual de produtos do administrador." },
    ],
  }),
  component: Vitrine,
});
