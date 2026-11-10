# FIT power lab

A website that reads the `.fit` files of a bike computer that has no power meter, **estimates the power** of every second of the ride from physics, draws the route on a map and the ride on charts, and lets you download a new `.fit` file with the estimated watts in it. It is made for the iGPSPORT iGS50E, and it works with any `.fit` activity that has time, distance, altitude and speed.

Everything runs in your browser. There is no server and no account.

## Privacy

| What                                                 | Where it goes                                                                                                                                                                                      |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Your `.fit` files, weights and results               | Nowhere. They are read and analysed on your computer.                                                                                                                                              |
| Preferences (language, units, theme, model settings) | Saved in your browser (`localStorage`).                                                                                                                                                            |
| Map background                                       | The browser asks a tile server for map tiles, and each request reveals the area you are looking at.                                                                                                |
| Terrain relief of the 3D video                       | Only when you make the 3D video: the browser asks a terrain server for elevation tiles of the area flown over, and each request reveals that area. You can choose the server or ask for no relief. |
| Anything else                                        | Nothing. The map and terrain tiles are the only network traffic of the app.                                                                                                                        |

You decide what the map does, in **Settings > Map privacy**:

- OpenStreetMap (the default), your own tile server, or no background at all (nothing is requested);
- hide the first and the last meters of the route, so the place you start from is not drawn;
- for the 3D video, use the public terrain tiles (AWS Open Data), your own terrain server (Terrarium elevation tiles) or no relief at all (nothing is requested).

The device itself is only ever read. The app never writes to it.

## Quick path

You need [Node.js](https://nodejs.org/) 20 or newer.

```bash
npm install
npm run dev      # open the address it prints
```

| Command             | What it does                                                                                                                                                               |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`       | Development server with hot reload.                                                                                                                                        |
| `npm test`          | Runs the unit and component tests once.                                                                                                                                    |
| `npm run e2e`       | End-to-end tests in Chrome (Playwright) against the production build, including an accessibility audit with axe-core. Needs Google Chrome installed.                       |
| `npm run typecheck` | TypeScript check, no output files.                                                                                                                                         |
| `npm run lint`      | ESLint. It also refuses a native `<button>`, `<input>`, `<select>`, `<textarea>`, `<label>` or `<table>` outside `src/components/ui/`: every control comes from shadcn/ui. |
| `npm run build`     | Type check, then the production build into `dist/`.                                                                                                                        |
| `npm run preview`   | Serves the production build locally.                                                                                                                                       |
| `npm run format`    | Prettier on the whole project.                                                                                                                                             |

First use: type the weight of the rider and of the bike (they are remembered), choose a `.fit` file, and read the result. No file at hand? Load the **sample ride**, a made-up ride of about 30 minutes with a climb, a stop and a descent.

## Reading the files from the iGPSPORT

1. Connect the bike computer to your computer with the USB cable. It appears as a drive.
2. Open the drive, then the `iGPSPORT` folder, then `Activities`. Each ride is a `.fit` file named after its date and time, for example `2024-02-25-08-30-59.fit`.
3. In the app, choose the file with the file picker of the **Overview** section.

You can also copy the files to your computer first and keep your own backup. The app only reads from the drive and never changes it.

## How the power is estimated

The bike computer records speed, altitude, distance, cadence, heart rate and position, but not watts. For every recorded second the app adds up what the rider has to overcome:

| Part                        | Depends on                                                                                                                               |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Gravity                     | Total weight and the **grade** of the road (the slope of altitude over distance, fitted over a short stretch around the point).          |
| Rolling resistance          | Total weight and the rolling coefficient of the tyres.                                                                                   |
| Air drag                    | Speed, the drag area and the **air density**, which is computed from altitude and temperature (thinner air at altitude means less drag). |
| Speeding up or slowing down | The change of kinetic energy since the previous point.                                                                                   |

The sum is divided by the efficiency of the drivetrain. Stops, coasting (cadence 0) and braking give 0 W.

### What makes it less exact

- **Wind.** It is not recorded. You can enter a wind speed and direction in the model settings.
- **Drafting.** Riding behind someone cuts the drag. The model assumes you ride alone unless you change the drafting factor.
- **Your position and your bike.** The drag area and the rolling coefficient are typical values, not yours.
- **Speed noise.** Small errors in the speed sensor show up as watts, mostly when starting, braking or stopping.
- **Altitude noise.** Barometric altitude drifts, which changes the grade.

Treat the numbers as a good guide to compare efforts and follow progress, not as laboratory values.

## The sections of the app

| Section  | What it is for                                                                                                                                                       |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Overview | Weights, choosing a `.fit` file, the summary, the route map coloured by power or another variable, the per-variable charts and the download of the new `.fit`.       |
| Metrics  | Normalized power, IF, TSS, FTP estimate, power curve, zones, W/kg, work, climbs and VAM, laps, cadence and torque, training load and personal records.               |
| Model    | The assumptions of the power model (posture, tyres, drag, drivetrain, wind, drafting, smoothing, braking, calibration) with a live estimate and an uncertainty band. |
| Library  | The rides you have loaded, the bike computer's folder, comparing two rides, a heat map of all rides, and files opened recently.                                      |
| Tools    | Trim a ride or remove its pauses, merge rides, smooth the GPS track, and correct the altitude with an elevation service (only after you confirm).                    |
| Device   | Model and firmware of the bike computer, sensors, a quality check of the file, a backup of its activities and the rider profile (`user.fit`) to edit and download.   |
| Settings | Language (English or Spanish), units (metric or imperial), theme (light, dark or the system's), map privacy, the introduction, the keyboard shortcuts and a reset.   |

Keyboard shortcuts: `1` to `7` go to the sections in this order, `u` switches the units, `d` changes the theme and `?` shows the list. They do not fire while you type in a field.

### Files in and out

- **In:** `.fit` (the bike computer's own files), `.gpx` and `.tcx`. Several files can be chosen or dropped on the page at once, and the last few rides are kept in this browser between visits.
- **Out:** a new `.fit` with the estimated power in every record (with a flag that marks the power as estimated, on by default, so that opening the file again never takes the estimate for a power meter reading; optionally also the session and lap power summary and a new file identity so that services do not take it for a duplicate of the original), and CSV, GPX, TCX and JSON. The charts download as PNG or SVG, and the ride can be printed as a report (save it as PDF from the print dialog) or shared as a summary card image (with the route on its map) or as a one-minute video of the whole route (see below).
- **The summary card** puts the route on the map tiles of the server chosen in **Settings > Map privacy**; with no background, or when the tiles cannot be loaded, it shows the route alone. The hidden first and last meters are not drawn and do not choose the area asked for, but the tiles that cover what is shown can still include the start: use a larger distance, or no background, to keep it private.
- **The 3D video** is a one-minute flight over the whole route, whatever its length: the rider is a dot in the middle, the map goes by under it with the relief of the terrain, and the speed, power, cadence, heart rate, grade, altitude, distance and time are written on top. **Download 3D video** gives a vertical MP4 (1080 x 1920, for phones); the menu next to it gives a horizontal one (1920 x 1080, for screens). It is made on this computer, faster than real time, with the browser's own H.264 encoder (it needs WebGL 2 and WebCodecs with H.264 encoding; it was tested in Chrome, and in a browser that lacks them the button says so and is switched off), and **Cancel video** stops it without a download. It asks for the map tiles and for the terrain tiles along the route (up to about 240 and 60 tiles: a long route uses a less detailed zoom), from the servers chosen in **Settings > Map privacy**; the hidden first and last meters are not drawn and do not choose the area asked for, but the tiles are asked for in blocks around what is shown, so a short hidden distance can still include the area of the start (use a larger distance, or no relief and no background, to keep it private). The relief is exaggerated a little so that it can be seen; the readings come from the ride, and the power is the estimate.
- A file that was exported by this app and opened again is recognised: its estimated power is never taken for a power meter reading, and exporting it again replaces the estimate.

### Offline and install

In the production build (`npm run build`, then `npm run preview`) the app registers a service worker. After one visit it opens without a connection, and it can be installed as an app. The map tiles (and the terrain tiles of the 3D video) you have already seen are kept for offline use, up to 1500 tiles in all; the **Settings** section shows what is saved and clears it. Anyone with access to the browser profile could infer the areas ridden from those tiles, so clear them before sharing a device.

## Desktop version (Tauri)

`src-tauri/` holds a [Tauri 2](https://tauri.app/) shell that wraps the same web app in a native window, so that a future version can read the device's folder without the permission prompts of a browser. It is a starting point: the app code does not use the desktop file access yet, and the shell has not been built in the environment where it was written.

You need Rust and the [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your system (on Windows, the C++ build tools and WebView2).

```bash
npm install --save-dev @tauri-apps/cli@^2   # skip it if `npm ls @tauri-apps/cli` already lists it
npx tauri icon path/to/a-square-image.png   # one time: creates src-tauri/icons/
npx tauri dev                               # runs `npm run dev` and opens the window
npx tauri build                             # builds `dist/` and the installer
```

The window may only read: its permissions allow listing and reading files in a folder you choose with the system dialog, and nothing that writes. `src-tauri/tauri.conf.json` expects the dev server at `http://localhost:5173`, which is the Vite default.

## Live copy and publishing

A copy runs at <https://ingfabianrodriguez.github.io/fit-power-lab/>. The source of this project is also published at <https://github.com/IngFabianRodriguez/IngFabianRodriguez.github.io/tree/main/fit-power-lab-source>. The build uses relative addresses (`base: "./"` in `vite.config.ts`), so the `dist/` folder works from any folder of a static host: copy its contents into the folder you want, and the service worker takes the scope of that folder. A check in `e2e/base-path.spec.ts` fails if the build ever points at the root of the server.

## Stack

React 18, Vite 5, TypeScript (strict), Tailwind CSS 4, shadcn/ui, Recharts, Leaflet, `@garmin/fitsdk`, `mp4-muxer` (loaded only when a video is made), Vitest with Testing Library and vitest-axe, and Playwright with axe-core.

## License

[MIT](LICENSE). The sample ride is synthetic and the tests use synthetic data only. Rides of your own are never part of the repository (`samples/` is git-ignored).
