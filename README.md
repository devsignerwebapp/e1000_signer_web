# e1000_signer_web

React 19 + Vite front-end for E1000Signer: landing page, guest demo, auth with 4-digit email OTP,
user workspace (documents, templates, API keys, webhooks), public signing page `/sign/:token`,
and the admin console at `/admin`.

```bash
npm install
npm run dev     # http://localhost:5173 — proxies /api and /embed.js to http://localhost:4000
npm run build   # production bundle in dist/
npm run lint
```

Set `VITE_API_URL` (see `.env.example`) only when the API is served from a different origin.
Details: [../.ai-knowledge/07-frontend.md](../.ai-knowledge/07-frontend.md).
