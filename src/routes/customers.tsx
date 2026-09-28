import { createFileRoute } from '@tanstack/react-router'
import { CustomerList } from '../pages/CustomerList'

export const Route = createFileRoute('/customers')({
  head: () => ({
    meta: [
      { title: "Clientes - Smart PDV PRO" },
      { name: "description", content: "Gerencie os clientes da sua loja." },
    ],
  }),
  component: CustomerList,
})
