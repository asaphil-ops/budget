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
