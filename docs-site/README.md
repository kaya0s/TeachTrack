## TeachTrack Docs Site

Documentation/user-guide site for TeachTrack (teacher client + backend + admin portal).

Built with Next.js (App Router) and structured as a single-page guide with section anchors (navbar links like `#features`, `#how-to-use`, etc.).

## Run (Dev)

```bash
cd docs-site
npm install
npm run dev
```

Open `http://localhost:3000`.

If PowerShell blocks `npm` scripts on your machine, use `npm.cmd` (example: `npm.cmd run dev`).

## Edit Content

- Page composition: `app/page.tsx`
- Section components: `components/`
- Styling: `app/globals.css` (Tailwind CSS)

## Build (Prod)

```bash
cd docs-site
npm run build
npm run start
```
