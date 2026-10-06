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

## Stable ngrok endpoint

The admin app proxies `/api/v1/*` to the local FastAPI server configured by
`API_PROXY_TARGET`. This allows one ngrok domain to serve both the admin portal
and API requests.

Start FastAPI on port 8000 and the production admin app on port 3000, then run:

```bash
ngrok http 3000 --url https://YOUR-STATIC-DOMAIN.ngrok.app
```

Configure the Flutter client with the same hostname:

```ini
BASE_URL=https://YOUR-STATIC-DOMAIN.ngrok.app
API_VERSION=/api/v1
```
