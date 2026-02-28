# TeachTrack Admin

Web admin control panel for TeachTrack with neutral shadcn-style design and dark/light themes.

## Features

- Superuser login
- Dashboard metrics and recent activity
- User management (activate/deactivate, grant/revoke admin, reset password)
- Session oversight (list + force stop)
- Alert center (severity filters + mark read)
- Model operations (list and select active detector model)

## Run

```bash
cd admin
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.
