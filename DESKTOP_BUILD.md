# Compiling JellyWisp as a Desktop Application (Windows / macOS / Linux)

JellyWisp is pre-configured with an Electron desktop shell (`electron/main.cjs` and `electron/preload.cjs`), a custom frameless titlebar with native window controls, and `electron-builder.json` for packaging on Windows, macOS, and Linux.

## 1. Prerequisites
- **Node.js 18+** and **npm** installed on your system.

## 2. Install Dependencies
Open a terminal in the project folder and run:

```bash
npm install
npm install -D electron electron-builder
```

## 3. Run in Desktop Development Mode
To launch JellyWisp inside a native frameless desktop window:

```bash
# Build frontend assets and open the Electron window
npm run build && npx electron .
```

## 4. Compile Standalone Desktop Installers

### Windows (`.exe` NSIS Installer + Portable `.exe`)
```bash
npm run desktop:win
```

### macOS (`.dmg` + `.zip` for Apple Silicon `arm64` & Intel `x64`)
```bash
npm run desktop:mac
```

### Linux (`.AppImage` + `.deb`)
```bash
npm run desktop:linux
```

All compiled desktop binaries and installers are output to the `release/` folder.
