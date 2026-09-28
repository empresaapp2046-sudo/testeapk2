# Plan: Navigation and Splash Flow Refinement

Refine the navigation flow to ensure the splash screen is shown on entry, the admin vitrine serves as the entry point for admins, and the 5x logo click trigger is consistently applied for redirection to login.

## Proposed Changes

### Core Logic & Navigation
#### `src/routes/__root.tsx`
- Ensure `AppLayout` consistently manages the `showSplash` state.
- Refine the redirect logic in `useEffect` to handle `AdminGeral` and `Cliente` roles properly when landing on `/`.
- Verify `isPublicRoute` includes all vitrine variations.

#### `src/routes/index.tsx`
- Update the root route to allow rendering the vitrine component for unauthenticated users and admins, or keep the redirection logic in `__root.tsx` but ensure it doesn't conflict.

### Page Components
#### `src/pages/Vitrine.tsx`
- Confirm the `handleLogoClick` (5x click trigger) is correctly implemented and redirects to the appropriate login path (`/$storeSlug/login` vs `/login`).
- Ensure it handles the "Admin Vitrine" case when no `storeSlug` is present.

### Validation Plan
- Test unauthenticated access to `/` -> Splash -> Vitrine.
- Test Admin login -> `/` -> Splash -> Admin Vitrine.
- Test Store Owner login -> `/` -> Splash -> `/dashboard`.
- Test Store Vitrine link (`/l/slug`) -> Splash -> Specific Store Vitrine.
- Verify 5x logo click on vitrines leads to the correct login page.
