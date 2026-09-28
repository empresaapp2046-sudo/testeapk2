# Plan - Tenant-Aware Friendly Slugs and Uniform Store Redirection

The goal is to ensure all Store Owners and Employees are consistently redirected to store-specific friendly slugs (e.g., `/loja-brasil/dashboard` instead of `/loja-id/dashboard`) across the entire platform, including registration, login, and dashboard access.

## Proposed Changes

### Database & Logic (StoreContext.tsx)
- **Slug Generation**: Update `publicRegisterStoreOwner` and `adminCreateStoreOwner` to generate a URL-friendly slug based on the `companyName`. If the slug already exists (in the `settings` collection), append a short random serial (e.g., `loja-brasil-5f3e`).
- **Storage**: Save this `slug` in the `settings` document for the store.
- **Login Redirection**: Update `login` to fetch the slug from the `settings` collection using the user's `ownerId` or `tenantId`, then redirect to `/${slug}/dashboard` (or `/pos`).

### User Interface & Navigation
- **Registration**: Update `RegisterStoreOwner.tsx` to handle the new slug-based redirection after success.
- **Sidebar**: Ensure the `getRoute` helper in `Sidebar.tsx` correctly resolves links within the friendly slug context for all menus, not just POS/Dashboard.
- **Root Layout**: Update `isPublicRoute` and auto-redirection logic in `__root.tsx` to be aware of the new slug patterns.

## Technical Details
- Use a helper function `generateStoreSlug(name: string, existingSlugs: string[])` to ensure uniqueness.
- The `settings` collection in Firestore will be the source of truth for mapping `ownerId` to `slug`.
- All tenant routes (e.g., `src/routes/$storeSlug.dashboard.tsx`) will correctly pick up the friendly slug via `useParams`.

## Security & Isolation
- RLS policies and existing tenant isolation logic already rely on `ownerId`/`tenantId`, which remain unchanged. The slug is purely a routing and presentation layer.
