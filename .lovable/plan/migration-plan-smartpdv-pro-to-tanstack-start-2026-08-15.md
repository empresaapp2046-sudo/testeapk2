# Migration Plan - SmartPDV Pro to TanStack Start

We are migrating a complete React 18 / Firebase POS system into the TanStack Start framework. This involves mapping the original page components to a new routing structure, ensuring context availability, and fixing compatibility issues.

## User Review Required

> [!IMPORTANT]
> The original app used `react-router-dom` with HashRouter. TanStack Start uses a different routing mechanism. I will map all existing pages to their new URLs.
> Some features like "AutoLogin" and "Vitrine" rely on specific URL structures which will be preserved or redirected.

## Proposed Changes

### 1. Routing System
- Map all components from `src/pages/` to `src/routes/`.
- Preserve the existing navigation logic in the `Sidebar`.
- Handle protected routes (Admin only, Employee permissions) within the route definition or a layout route.

### 2. Page Mapping
- `/` -> `src/routes/index.tsx` (Dashboard)
- `/pos` -> `src/routes/pos.tsx` (POS)
- `/companies` -> `src/routes/companies.tsx` (Companies)
- `/inventory` -> `src/routes/inventory.tsx` (Inventory)
- `/payables` -> `src/routes/payables.tsx` (Payables)
- `/finance` -> `src/routes/finance.tsx` (Finance)
- `/messages` -> `src/routes/messages.tsx` (Messages)
- `/raffles` -> `src/routes/raffles.tsx` (Raffles)
- `/cash-reports` -> `src/routes/cash-reports.tsx` (CashReports)
- `/corporate-reports` -> `src/routes/corporate-reports.tsx` (CorporateReports)
- `/reports` -> `src/routes/reports.tsx` (Reports)
- `/admin` -> `src/routes/admin.tsx` (AdminDashboard)
- `/employees` -> `src/routes/employees.tsx` (EmployeeManagement)
- `/settings` -> `src/routes/settings.tsx` (Settings)
- `/login` -> `src/routes/login.tsx` (Login)
- `/autologin` -> `src/routes/autologin.tsx` (AutoLogin)
- `/vitrine` -> `src/routes/vitrine.tsx` (Vitrine)

### 3. Build & Type Fixes
- Fix TypeScript errors related to missing `react-router-dom` imports in individual components (swap to `@tanstack/react-router`).
- Address `any` types and optional property issues that are causing build failures.
- Fix broken exports (e.g. `Pix` icon from `lucide-react`).

## Technical Details

### Route Structure
Using TanStack File-based routing:
```text
src/routes/
  ├── __root.tsx (Layout & Providers)
  ├── index.tsx (Dashboard)
  ├── pos.tsx
  ├── login.tsx
  ├── ...
```

### Dependency Updates
- Replace `react-router-dom` hooks (`useNavigate`, `useLocation`) with `@tanstack/react-router` equivalents (`useRouter`, `useLocation`, `Link`).

### Integration
- Ensure `StoreProvider` wraps the entire application in `__root.tsx`.
- Sync original `StoreContext.tsx` methods with the UI components.
