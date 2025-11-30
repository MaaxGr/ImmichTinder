# Immich Tinder

A tiny Nuxt 4 app that lets you swipe through random photos from your own Immich server — like Tinder, but for your photo library. It fetches random assets from Immich, displays the image with basic EXIF info (date and location when available), and provides like/dislike actions (currently mocked).

- Framework: Nuxt 4 (Nitro server)
- Runtime: Node.js 22+
- Server routes live under `server/api/*` and proxy Immich with your API key so it never reaches the browser directly.

## Prerequisites

- Node.js >= 22.12.0
- An Immich instance you can access (URL) and an API key
- npm (or another compatible package manager)

## Environment variables

Create a `.env` file at the project root with the following variables:

```
IMMICH_URL=https://your-immich.example.com
IMMICH_TOKEN=your_immich_api_key
```

Notes:
- IMMICH_URL is your Immich base URL (no trailing slash).
- IMMICH_TOKEN is used as the `x-api-key` when the server calls Immich.

## Install

```bash
npm ci
```

If you prefer another package manager, adjust accordingly (the project includes npm scripts).

## Run in development

```bash
npm run dev
```

Then open http://localhost:3000.

## Build for production

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Docker

A multi‑stage Dockerfile is provided.

Build the image:

```bash
docker build -t immich-tinder .
```

Run the container (exposes port 3000):

```bash
docker run --rm -p 3000:3000 \
  -e IMMICH_URL=https://your-immich.example.com \
  -e IMMICH_TOKEN=your_immich_api_key \
  immich-tinder
```

## API routes (server)

These routes are implemented under `server/api` and run only on the server side.

- GET `/api/random`
  - Returns a random Immich asset with a normalized payload:
    - `id`, `localDateTime`, `takenAt`, and `location` (with `text`, `city`, `state`, `country`, `latitude`, `longitude` when available).

- GET `/api/image?id=ASSET_ID`
  - Streams the original image bytes for the given asset ID.
  - Response headers include `Content-Type: image/jpeg` and an inline `Content-Disposition`.

- POST `/api/like` and POST `/api/dislike`
  - Accept a JSON body like `{ "id": "ASSET_ID" }`.
  - Currently mocked to return `{ success: true }`. The Immich calls are present in comments for future enabling.

## How it works (high level)

- The client requests a random asset via `/api/random`.
- When an image needs to be displayed, the client requests `/api/image?id=...` which the server proxies to Immich and returns the binary data.
- Likes/dislikes are posted to server routes which can be wired to Immich (favorite toggle) when desired.

## Troubleshooting

- 400 Missing id in request body: Ensure you send `{ id: "..." }` to `/api/like` or `/api/dislike`.
- 400 Missing ?id parameter: Provide `?id=...` when calling `/api/image`.
- 404 Image not found: The asset might be missing or the ID is wrong.
- 5xx from Immich: Verify `IMMICH_URL` and `IMMICH_TOKEN`, and that your Immich server is reachable from the app/container.

## Scripts

- `npm run dev` — Start the dev server
- `npm run build` — Build for production (Nitro output in `.output`)
- `npm run preview` — Preview the production build locally

## Security

- Your Immich API key is used only on the server (Nitro) side. Do not expose it in client code.
- In Docker, pass the env vars at runtime (see command above). Avoid baking secrets into images.

## Project structure (selected)

- `app/` — Vue components and pages
- `server/api/` — Nitro routes that talk to Immich
- `public/` — Static assets
- `nuxt.config.ts` — Nuxt configuration
- `Dockerfile` — Multi‑stage build for production

## License

No license specified. Add one if you intend to share or open‑source this project.
