# POS System Migration and Bug Fixes

The project is currently experiencing several TypeScript build errors following the migration to TanStack Start. This plan addresses these errors systematically to restore application stability.

## User Review Required

> [!IMPORTANT]
> Some logic checks for `UserRole` and `LicenseKey` are being relaxed with `any` casting where type definitions are missing or complex, ensuring the app builds while maintaining functional parity with the original codebase.

## Proposed Changes

### Core Types (`src/types.ts`)
- Add `LicenseKey` and `LicenseType` type aliases for consistency.
- Add `posConfig` to `SettingsVisibilityConfig` interface.

### Store Context (`src/context/StoreContext.tsx`)
- Import `UserRole`, `LicenseKey`, and `LicenseType` from `src/types.ts`.
- Fix `handleFirestoreError` type mismatch for `tenantId` (ensuring it's a string).
- Fix `normalizeDate` to safely handle numeric date parts.
- Fix `addSale` and CRUD actions to ensure `ownerId` is always a string and matches the expected type.
- Update `initialSettingsVisibility` to include `posConfig`.
- Fix sorting in `financialRecords` to use `dueDate` instead of the non-existent `date` property.
- Safely access `plans` in `settings.menuVisibility` using index signatures.

### UI Components (Safety Checks)
- **CustomerInfoModal.tsx**: Add safety checks for `records[0]` and `r.history` to prevent `undefined` access.
- **PaymentModal.tsx**: Add safety checks for `match.history` when displaying payment dates.
- **RaffleCampaignsManager.tsx**: Ensure date strings have fallbacks to empty strings when split.
- **TransactionModal.tsx**: Fix `CashTransaction` creation by ensuring `tenantId` is handled correctly and supervisor data is cast to `any` for safe property access.

### Chart Components (`src/components/ui/chart.tsx`)
- Re-apply `any` casting to `payload` and `label` in Recharts wrappers to satisfy Recharts' complex generic types without causing syntax errors.

## Verification Plan

### Automated Tests
- Run `bun x tsc --noEmit` to verify all TypeScript errors are resolved.
- Run `bun run build` to ensure the project bundles correctly.

### Manual Verification
- Open the POS and verify a sale can be completed.
- Open the Inventory and verify products can be edited.
- Open the Financial section and verify records are displayed and sorted correctly.
- Open a Customer modal and verify debt history is visible.
