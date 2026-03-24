# Avia JS V10 Demo App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a standalone React + Vite 8 app at `~/dev/avia-js-v10` that demonstrates building a custom Media component using avia-js and `@videojs/*` packages.

**Architecture:** Copy 3 avia source files from v10 into the new app with rewired imports. Import all Video.js abstractions (`DelegateMixin`, `ProxyMixin`, `CustomMediaMixin`, hooks, skins) from `@videojs/*` packages. The app renders a single page with a centered video player using `VideoSkin` controls and a hardcoded DASH stream URL.

**Tech Stack:** Vite 8, React 19, TypeScript, `@videojs/core`, `@videojs/react`, `@cbsinteractive/avia-js`, `@cbsinteractive/avia-js-cmaf`

**Spec:** `docs/superpowers/specs/2026-03-23-avia-js-v10-demo-app-design.md`

---

### Task 1: Fix export gaps in `@videojs/core`

`DelegateMixin` and `Delegate` are not exported from any barrel. Add them to the core barrel.

**Files:**
- Modify: `/Users/cocch1216/dev/v10/packages/core/src/core/index.ts`

- [ ] **Step 1: Add the delegate re-export**

Add `export * from './media/delegate';` to the barrel file at `packages/core/src/core/index.ts`, alongside the existing `export * from './media/proxy';`:

```ts
export * from './media/delegate';
export * from './media/proxy';
export * from './media/state';
```

- [ ] **Step 2: Build core package to verify**

Run: `cd /Users/cocch1216/dev/v10 && pnpm -F @videojs/core build`
Expected: Build completes without errors. `dist/dev/index.d.ts` now contains `DelegateMixin` and `Delegate`.

- [ ] **Step 3: Verify the export is accessible**

Run: `cd /Users/cocch1216/dev/v10 && grep -l 'DelegateMixin' packages/core/dist/dev/index.d.ts`
Expected: File found, confirming the export is in the built output.

- [ ] **Step 4: Commit**

```bash
cd /Users/cocch1216/dev/v10
git add packages/core/src/core/index.ts
git commit -m "feat(core): export DelegateMixin and Delegate from core barrel"
```

---

### Task 2: Fix export gaps in `@videojs/react`

Four internal React utilities (`useDestroy`, `useComposedRefs`, `attachMediaElement`, `mediaProps`) are not exported. Add them to the React barrel.

**Files:**
- Modify: `/Users/cocch1216/dev/v10/packages/react/src/index.ts`

- [ ] **Step 1: Add utility exports**

Add these four new lines to the existing `// Utilities` section in `packages/react/src/index.ts` (the section already exports `mergeProps`, types, and `renderElement` — do NOT duplicate those):

```ts
export { attachMediaElement } from './utils/attach-media-element';
export { mediaProps } from './utils/media-props';
export { composeRefs, useComposedRefs } from './utils/use-composed-refs';
export { useDestroy } from './utils/use-destroy';
```

- [ ] **Step 2: Build react package to verify**

Run: `cd /Users/cocch1216/dev/v10 && pnpm -F @videojs/react build`
Expected: Build completes without errors.

- [ ] **Step 3: Verify the exports are accessible**

Run: `cd /Users/cocch1216/dev/v10 && grep 'useDestroy\|useComposedRefs\|attachMediaElement\|mediaProps' packages/react/dist/dev/index.d.ts`
Expected: All four names appear in the built declarations.

- [ ] **Step 4: Commit**

```bash
cd /Users/cocch1216/dev/v10
git add packages/react/src/index.ts
git commit -m "feat(react): export useDestroy, useComposedRefs, attachMediaElement, mediaProps"
```

---

### Task 3: Scaffold the Vite app

Create the project skeleton at `~/dev/avia-js-v10` with all config files.

**Files:**
- Create: `~/dev/avia-js-v10/package.json`
- Create: `~/dev/avia-js-v10/tsconfig.json`
- Create: `~/dev/avia-js-v10/vite.config.ts`
- Create: `~/dev/avia-js-v10/index.html`
- Create: `~/dev/avia-js-v10/src/vite-env.d.ts`

- [ ] **Step 1: Create project directory**

```bash
mkdir -p ~/dev/avia-js-v10/src/media/avia
```

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "avia-js-v10",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@cbsinteractive/avia-js": "^2.58.0",
    "@cbsinteractive/avia-js-cmaf": "^2.58.0",
    "@videojs/core": "link:../v10/packages/core",
    "@videojs/react": "link:../v10/packages/react",
    "react": "^19.2.1",
    "react-dom": "^19.2.1"
  },
  "devDependencies": {
    "@types/react": "^19.2.7",
    "@types/react-dom": "^19.2.7",
    "@vitejs/plugin-react": "^4.5.2",
    "typescript": "^5.9.3",
    "vite": "^8.0.0"
  }
}
```

Note: `@videojs/core` and `@videojs/react` use `link:` to reference the local v10 monorepo. This allows development without publishing. The `@cbsinteractive/*` packages install from npm.

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create `vite.config.ts`**

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
});
```

- [ ] **Step 5: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Avia JS — Video.js 10 Demo</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create `src/vite-env.d.ts`**

```ts
/// <reference types="vite/client" />
```

This gives TypeScript the type definitions for Vite features (CSS imports, `import.meta`, etc.).

- [ ] **Step 7: Initialize git repo**

```bash
cd ~/dev/avia-js-v10
git init
printf "node_modules\ndist\n" > .gitignore
```

- [ ] **Step 8: Commit scaffold**

```bash
cd ~/dev/avia-js-v10
git add -A
git commit -m "chore: scaffold vite + react + typescript project"
```

---

### Task 4: Copy avia source files with rewired imports

Copy the 3 avia files from v10, updating imports to use `@videojs/*` packages instead of relative paths.

**Files:**
- Create: `~/dev/avia-js-v10/src/media/avia/text-track.ts` (copy from v10, no import changes needed)
- Create: `~/dev/avia-js-v10/src/media/avia/text-track-list.ts` (copy from v10, no import changes needed)
- Create: `~/dev/avia-js-v10/src/media/avia/index.ts` (copy from v10, rewire imports)

- [ ] **Step 1: Copy `text-track.ts`**

Copy `packages/core/src/dom/media/avia/text-track.ts` from v10 to `src/media/avia/text-track.ts`. No import changes — it only imports from `@cbsinteractive/avia-js` and the relative `./text-track-list`.

```ts
import { TextTrackKind as AviaTextTrackKind, type TextTrackInterface } from '@cbsinteractive/avia-js';

import type { AviaTextTrackList } from './text-track-list';

export class AviaTextTrack extends EventTarget implements TextTrack {
  readonly #aviaTrack: TextTrackInterface;
  readonly #list: AviaTextTrackList;

  readonly id: string;
  readonly kind: TextTrackKind;
  readonly label: string;
  readonly language: string;

  #mode: TextTrackMode = 'disabled';

  constructor(aviaTrack: TextTrackInterface, list: AviaTextTrackList) {
    super();
    this.#aviaTrack = aviaTrack;
    this.#list = list;
    this.id = aviaTrack.id;
    this.kind = aviaTrack.kind === AviaTextTrackKind.FORCED ? 'subtitles' : (aviaTrack.kind as string as TextTrackKind);
    this.label = aviaTrack.label ?? '';
    this.language = aviaTrack.language;
  }

  get aviaTrack(): TextTrackInterface {
    return this.#aviaTrack;
  }

  get mode(): TextTrackMode {
    return this.#mode;
  }

  set mode(value: TextTrackMode) {
    if (this.#mode === value) return;
    this.#mode = value;
    this.#list.handleModeChange(this, value);
  }

  get cues(): TextTrackCueList | null {
    return null;
  }

  get activeCues(): TextTrackCueList | null {
    return null;
  }

  addCue(_cue: TextTrackCue): void {
    // no-op — avia owns cue rendering
  }

  removeCue(_cue: TextTrackCue): void {
    // no-op — avia owns cue rendering
  }

  get sourceBuffer(): SourceBuffer | null {
    return null;
  }

  get inBandMetadataTrackDispatchType(): string {
    return '';
  }

  get oncuechange(): ((this: TextTrack, ev: Event) => void) | null {
    return null;
  }

  set oncuechange(_handler: ((this: TextTrack, ev: Event) => void) | null) {
    // no-op
  }

  /** @internal — used by AviaTextTrackList to set mode without triggering outbound sync */
  _setModeInternal(value: TextTrackMode): void {
    this.#mode = value;
  }
}
```

- [ ] **Step 2: Copy `text-track-list.ts`**

Copy `packages/core/src/dom/media/avia/text-track-list.ts` from v10 to `src/media/avia/text-track-list.ts`. No import changes — it only imports from `@cbsinteractive/avia-js` and the relative `./text-track`.

The file is identical to the v10 source. Copy it as-is.

- [ ] **Step 3: Copy and rewire `index.ts`**

Copy `packages/core/src/dom/media/avia/index.ts` from v10 to `src/media/avia/index.ts`. Rewire the three relative `@videojs` imports to package imports, and inline `MediaProxyMixin`:

```ts
import { Autoplay, createVideoPlayer, LogLevel, type VideoPlayerInterface } from '@cbsinteractive/avia-js';
import { cmaf } from '@cbsinteractive/avia-js-cmaf';

import { type Delegate, DelegateMixin } from '@videojs/core';
import { CustomMediaMixin } from '@videojs/core/dom/media/custom-media-element';
import { ProxyMixin } from '@videojs/core';
import { AviaTextTrackList } from './text-track-list';

const MediaProxyMixin = ProxyMixin(
  globalThis.HTMLVideoElement ?? class {},
  globalThis.HTMLMediaElement ?? class {},
  globalThis.EventTarget ?? class {}
);

export class AviaMediaDelegateBase implements Delegate {
  #engine: VideoPlayerInterface | null = null;
  #src: string = '';
  #textTracks = new AviaTextTrackList();

  // TODO: Attach is called twice, which ends up creating two engines.
  #initializing = false;

  get engine(): VideoPlayerInterface | null {
    return this.#engine;
  }

  // TODO: Are there any other workflow entry points other than `attach`?
  //       We need async initialization for the engine to be ready.
  #init = async (target: HTMLMediaElement) => {
    if (!target.parentElement || this.#initializing) {
      return;
    }

    this.#initializing = true;

    // TODO: How can config properties be passed in?
    this.#engine = await createVideoPlayer({
      logLevel: LogLevel.DEBUG,
      autoplay: Autoplay.ATTEMPT_UNMUTED,
      container: target.parentElement,
      plugins: [
        cmaf({
          debug: true,
        }),
      ],
    });

    await this.#applySrc();

    this.#textTracks.connect(this.#engine);

    this.#initializing = false;
  };

  #applySrc = async () => {
    if (!this.#engine || !this.#src) {
      return;
    }

    await this.#engine?.attachResource({
      location: {
        mediaUrl: this.#src,
      },
    });
  };

  attach(target: EventTarget): void {
    // TODO: Attach is called twice, which ends up creating two engines.
    this.#init(target as HTMLMediaElement);
  }

  detach(): void {
    this.#textTracks.disconnect();
  }

  // TODO: We need async destruction. It is vital to await destroy before creating a new player.
  destroy(): void {
    this.#textTracks.disconnect();
    this.#engine?.destroy();
  }

  // TODO: This is too simplistic for our needs. How do we pass in all the other necessary properties?
  //       (DRM, Ads, etc.)
  set src(src: string) {
    // TODO: Is src always set before attach?
    if (!this.#engine) {
      this.#src = src;
    } else {
      // TODO: This is a setter, so there is no way to await.
      this.#applySrc();
    }
  }

  get src(): string {
    return this.#src;
  }

  // Cannot expose currentTime directly because injected ads should not affect the playback position.
  get currentTime(): number {
    return this.#engine?.contentTime ?? 0;
  }

  // Setting currentTime is a protected operation.
  set currentTime(time: number) {
    // TODO: No way to await this async operation.
    this.#engine?.seek(time);
  }

  // Cannot expose duration directly because injected ads should not affect the playback duration.
  get duration(): number {
    return this.#engine?.contentDuration ?? 0;
  }

  // V10 calls play() on the attached media element. Need to override to call play() on the engine.
  async play(): Promise<void> {
    if (!this.#engine) {
      return;
    }

    await this.#engine.play();
  }

  // V10 calls pause() on the attached media element. Need to override to call pause() on the engine.
  async pause(): Promise<void> {
    if (!this.#engine) {
      return;
    }

    await this.#engine.pause();
  }

  get textTracks(): TextTrackList {
    return this.#textTracks;
  }
}

// This is used by the web component because it needs to extend HTMLElement!
export class AviaCustomMedia extends DelegateMixin(
  CustomMediaMixin(globalThis.HTMLElement ?? class {}, { tag: 'video' }),
  AviaMediaDelegateBase
) {}

// This is used by the React component.
export class AviaMedia extends DelegateMixin(MediaProxyMixin, AviaMediaDelegateBase) {}
```

- [ ] **Step 4: Commit**

```bash
cd ~/dev/avia-js-v10
git add src/media/
git commit -m "feat: copy avia source files with rewired imports"
```

---

### Task 5: Write the app components

Create `main.tsx`, `App.tsx`, and `App.css`.

**Files:**
- Create: `~/dev/avia-js-v10/src/main.tsx`
- Create: `~/dev/avia-js-v10/src/App.tsx`
- Create: `~/dev/avia-js-v10/src/App.css`

- [ ] **Step 1: Create `App.css`**

```css
body {
  margin: 0;
  background: #111;
  color: #fff;
  font-family: system-ui, sans-serif;
}

.player-container {
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem;
}
```

- [ ] **Step 2: Create `App.tsx`**

```tsx
import { createPlayer, useMediaAttach, attachMediaElement, mediaProps, useComposedRefs, useDestroy } from '@videojs/react';
import { videoFeatures, VideoSkin } from '@videojs/react/video';
import '@videojs/react/video/skin.css';
import type { PropsWithChildren, VideoHTMLAttributes } from 'react';
import { forwardRef, useMemo } from 'react';

import { AviaMedia } from './media/avia';
import './App.css';

const AVIA_SRC =
  'https://vod-gcs-cedexis-dev.cbsaavideo.com/CBS_Production_Entertainment_VMS/2024/08/14/2363551811915/15848_cmaf_clear_ondemand/stream_adjusted_vtt.mpd';

// --- Custom Media Component ---

type AviaVideoProps = PropsWithChildren<VideoHTMLAttributes<HTMLVideoElement>>;

const AviaVideo = forwardRef<HTMLVideoElement, AviaVideoProps>(({ children, ...props }, ref) => {
  const mediaApi = useMemo(() => new AviaMedia(), []);
  const setMedia = useMediaAttach();

  useDestroy(mediaApi, () => {
    setMedia?.(mediaApi);
  });

  const composedRef = useComposedRefs(attachMediaElement(mediaApi), ref);

  return (
    <video ref={composedRef} {...mediaProps(mediaApi, props)}>
      {children}
    </video>
  );
});

// --- App ---

const { Provider: VideoProvider } = createPlayer({
  features: videoFeatures,
});

export default function App() {
  return (
    <VideoProvider>
      <div className="player-container">
        <VideoSkin className="w-full aspect-video">
          <AviaVideo src={AVIA_SRC} playsInline />
        </VideoSkin>
      </div>
    </VideoProvider>
  );
}
```

- [ ] **Step 3: Create `main.tsx`**

```tsx
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(<App />);
```

- [ ] **Step 4: Commit**

```bash
cd ~/dev/avia-js-v10
git add src/main.tsx src/App.tsx src/App.css
git commit -m "feat: add App with AviaVideo player and VideoSkin controls"
```

---

### Task 6: Install dependencies and verify

Install all packages, build v10 dependencies, and verify the app runs.

- [ ] **Step 1: Build v10 packages**

The `link:` dependencies need built output. Build all v10 packages:

```bash
cd /Users/cocch1216/dev/v10
pnpm build:packages
```

Expected: All packages build successfully.

- [ ] **Step 2: Install dependencies**

```bash
cd ~/dev/avia-js-v10
pnpm install
```

Expected: All dependencies resolve. `@videojs/core` and `@videojs/react` link to local v10 packages. `@cbsinteractive/*` packages install from npm.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd ~/dev/avia-js-v10
npx tsc --noEmit
```

Expected: No type errors. If there are errors, fix them before proceeding.

- [ ] **Step 4: Start dev server**

```bash
cd ~/dev/avia-js-v10
pnpm dev
```

Expected: Vite starts on `http://localhost:5173`. Open in browser — the page should show a centered video player with avia-js loading the DASH stream.

- [ ] **Step 5: Manual verification checklist**

In the browser, verify:
- Video player is visible and centered on a dark background
- Player controls (play/pause, seek bar, volume, fullscreen) are rendered
- Video stream loads and plays (or at least the avia engine initializes without errors — check browser console)
- Captions button appears if the stream has text tracks

- [ ] **Step 6: Commit any fixes**

If any adjustments were needed during verification:

```bash
cd ~/dev/avia-js-v10
git add -A
git commit -m "fix: adjustments from manual verification"
```

---

### Task 7: Remove avia code from v10

Now that the demo app works independently, clean up the v10 repo.

**Files:**
- Delete: `/Users/cocch1216/dev/v10/packages/core/src/dom/media/avia/` (entire directory)
- Delete: `/Users/cocch1216/dev/v10/packages/react/src/media/avia-video/` (entire directory)
- Delete: `/Users/cocch1216/dev/v10/packages/sandbox/templates/react-avia-video/` (entire directory)
- Modify: `/Users/cocch1216/dev/v10/packages/sandbox/app/constants.ts` (remove `'avia-video'` from `PRESETS`)
- Modify: `/Users/cocch1216/dev/v10/packages/sandbox/app/shell/navbar.tsx` (remove `'avia-video'` label)
- Modify: `/Users/cocch1216/dev/v10/packages/sandbox/app/shared/sources.ts` (remove `'avia'` source entry)
- Modify: `/Users/cocch1216/dev/v10/packages/core/package.json` (remove `@cbsinteractive/*` dependencies)

- [ ] **Step 1: Delete avia directories**

```bash
cd /Users/cocch1216/dev/v10
rm -rf packages/core/src/dom/media/avia
rm -rf packages/react/src/media/avia-video
rm -rf packages/sandbox/templates/react-avia-video
```

- [ ] **Step 2: Remove `'avia-video'` from sandbox PRESETS**

In `packages/sandbox/app/constants.ts`, remove `'avia-video'` from the `PRESETS` array.

- [ ] **Step 3: Remove `'avia-video'` label from navbar**

In `packages/sandbox/app/shell/navbar.tsx`, remove the `'avia-video': 'Avia Video'` entry from `PRESET_LABELS`.

- [ ] **Step 4: Remove `'avia'` source from sources**

In `packages/sandbox/app/shared/sources.ts`, remove the `'avia'` entry from the `SOURCES` object.

- [ ] **Step 5: Remove `@cbsinteractive/*` dependencies from core**

In `packages/core/package.json`, remove `@cbsinteractive/avia-js` and `@cbsinteractive/avia-js-cmaf` from `dependencies`.

- [ ] **Step 6: Verify v10 still builds and tests pass**

```bash
cd /Users/cocch1216/dev/v10
pnpm install
pnpm build:packages
pnpm typecheck
pnpm test
```

Expected: All pass. No remaining references to avia code.

- [ ] **Step 7: Commit cleanup**

```bash
cd /Users/cocch1216/dev/v10
git add -A
git commit -m "refactor: remove avia integration — moved to standalone avia-js-v10 app"
```
