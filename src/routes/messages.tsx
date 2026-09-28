// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import { Messages } from '../pages/Messages';

export const Route = createFileRoute('/messages')({
  head: () => ({
    meta: [
      { title: "Mensagens & WhatsApp - Smart PDV PRO" },
      { name: "description", content: "Gerencie modelos de mensagens para comunicação com clientes." },
      { property: "og:title", content: "Mensagens & WhatsApp - Smart PDV PRO" },
      { property: "og:description", content: "Gerencie modelos de mensagens para comunicação com clientes." },
    ],
  }),
  component: Messages,
});
