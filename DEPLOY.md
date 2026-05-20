# Deployment

## GitHub Pages

This workflow deploys the frontend only. The backend API in `server/index.js` must be hosted separately, then set this GitHub repository variable:

```text
VITE_API_BASE=https://your-api-host.example.com
```

In GitHub, go to:

```text
Settings -> Secrets and variables -> Actions -> Variables -> New repository variable
```

Then enable GitHub Pages:

```text
Settings -> Pages -> Source: GitHub Actions
```

## Local API

Set `DATABASE_URL` before running the server:

```powershell
$env:DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
npm run server
```

## Backend API Hosting

GitHub Pages can host only the frontend. The API server must be deployed separately.

For Render:

1. Create a new Web Service from this GitHub repo.
2. Use `render.yaml` or set:
   - Build Command: `npm ci`
   - Start Command: `npm run server`
3. Add environment variable:
   - `DATABASE_URL`
4. After Render gives you a URL, rebuild the frontend with:

```powershell
$env:VITE_API_BASE="https://your-render-service.onrender.com"
npm run build
```

Then publish the `dist` folder to the `gh-pages` branch.
