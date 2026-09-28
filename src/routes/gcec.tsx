import { createFileRoute } from '@tanstack/react-router'
import GCECPage from '../pages/GCEC'

export const Route = createFileRoute('/gcec')({
  component: GCECPage,
})
