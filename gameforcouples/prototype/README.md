# Roomscape prototype

The play page (`index.html`) loads its room from `maps/room-01/map.json`, its furniture catalog from `assets/asset-manifest.json`, and character movement, animation, collision size, spawn, and camera settings from `game-settings.json`. Room 01 is an orthogonal multi-room floor plan with tiled floors, open passages, and collision constrained to the connected walkable floor regions. The camera follows the Explorer from the south entrance; the responsive camera changes the visible window without stretching furniture or the character. Move with WASD or arrow keys, click or tap a destination, or use the virtual joystick on touch screens. The Explorer walk cycle is enabled at 6 frames per second.

The motion lab at `animation.html` is a sprite-sheet editor. Load or drop an image, drag boxes around poses, adjust exact source-pixel coordinates and dimensions, label and reorder frames, then preview the animation at 1–24 fps. “Save locally” stores the source sheet and sequence in IndexedDB in the current browser; “Export project” downloads a portable JSON project that includes the image. The saved Explorer animation can be run at `walk-preview.html`; it uses a lossless WebP atlas and retains the original crop coordinates in `assets/explorer-walk-frames.json`. No backend or game engine is required for this preview. Browser storage availability can vary for pages opened directly as `file://`; the portable export is the backup.

The map designer reads `assets/asset-manifest.json`. Open `asset-importer.html` through the local web server to upload prop art. Add each processed asset to the batch; when ready, “Create ZIP” downloads one project-ready archive with all optimized transparent WebP images and the updated asset catalog. Extract that archive into this `prototype` folder. Processing is client-side; no server-side backend is used. The designer displays normal-state assets, lets you position, resize, rotate, reorder them, and drag polygon vertices to refine their collision outline. Choose “Save to project” and select this `prototype` folder; it writes `maps/room-01/map.json`, which the play page reads directly. “Export” downloads that same layout JSON. Images stay as files in `assets/`; the map JSON stores their paths and placement/collision data.

For manually copied or bulk-added files, the catalog can still be rebuilt (from the repository root):

```sh
cd gameforcouples/prototype
node scripts/build-asset-manifest.mjs
cd ../..
```

The play page renders through Phaser's automatic renderer, which selects WebGL when available and falls back to Canvas. Phaser is currently loaded from jsDelivr, so the first page load requires an internet connection; bundle the Phaser file locally if offline startup is required.

Run through a local web server so the pages can fetch their JSON configuration files. From the repository root:

```sh
python3 -m http.server 4173
```

Then open <http://localhost:4173/gameforcouples/prototype/>. Opening the HTML pages directly as `file://` does not allow the JSON requests.
