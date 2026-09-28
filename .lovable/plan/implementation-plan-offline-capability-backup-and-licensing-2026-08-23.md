# Implementation Plan - Offline Capability, Backup, and Licensing Sync

Implement a hybrid offline-online system for "Smart PDV PRO". The app will function offline with local data persistence in files but maintain online authentication and license verification.

## User Requirements
- **Offline Data**: Save all operational data (products, sales, customers, etc.) to local folders when running on a local machine.
- **Online Login**: Authentication and license sync must remain online.
- **License Protection**: Prevent local tampering with license keys and expiration dates.
- **Backup/Export**: Generate a ZIP of the source code for local execution.
- **Local Automation**: Provide an `iniciar.bat` script and a browser extension for easy local setup.

## Technical Tasks

### 1. Project Setup & Automation
- Add `adm-zip` to `package.json` for server-side zipping.
- Create `iniciar.bat` at the project root to automate `npm install` and `npm run dev`.
- Create an `extension/` directory with `manifest.json` and `background.js` to provide a shortcut to `http://localhost:8080`.
- Create a `data/` directory to store local JSON files.

### 2. Offline Data Layer (Server Functions)
- Create `src/lib/offline.functions.ts`:
    - `saveLocalData`: Writes JSON state to `data/{category}.json`.
    - `loadLocalData`: Reads JSON state from `data/{category}.json`.
    - These functions will use the `fs` module, which is available when running locally via Vite.

### 3. StoreContext Integration
- Detect environment: `const isLocal = window.location.hostname === 'localhost'`.
- Modify `StoreContext.tsx`:
    - Update state persistence logic: If `isLocal`, call `saveLocalData` server functions after every change.
    - On initialization, if `isLocal`, load initial state from `loadLocalData`.
    - Maintain `localStorage` as a secondary fallback.
    - **Licensing**: During the `login` process (which remains online via Firebase), sync the latest license info from the cloud and store it in a dedicated "protected" local file.

### 4. Settings UI Enhancements
- Add "Backup e Exportação" section to `src/pages/Settings.tsx`.
- Implement a "Download Source (ZIP)" button that calls the zipping server function.
- Display setup instructions (Extract -> Install Node -> Run .bat).

### 5. Backup Server Function
- Create `src/lib/download.functions.ts` with `downloadProjectAction`:
    - Zips the root directory.
    - Excludes: `node_modules`, `.git`, `.output`, `dist`, `.lovable`, etc.
    - Returns a buffer/stream for the browser to download.

### 6. Security & Verification
- Implement a integrity check for the license: The app will re-validate the license against the online backend every time it has an internet connection, even if running locally.

## Technical Details
- **Persistence Strategy**: Uses `JSON.stringify/parse` for local files. While not as robust as SQLite, it satisfies the "save in folders" requirement and is easy to debug.
- **Runtime**: Works in the TanStack Start environment. The `fs` operations in `createServerFn` will work on the developer's local machine.

## Considerations
- **Firebase Auth**: Requires an internet connection. The user explicitly requested login to remain online.
- **Data Conflicts**: When switching from offline to online, a "Sync" action will be prompted to the user.
