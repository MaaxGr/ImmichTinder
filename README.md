
<p align="center">
  <img src="public/logo.png" alt="Immich Tinder" width="180" />
</p>

A tiny Nuxt 4 app that lets you swipe through random photos from your own Immich server — like Tinder, but for your photo library. It fetches random assets from Immich, displays the image with basic EXIF info (date and location when available), and supports like, superlike, and delete actions via server routes.

<p align="center">
  <img src="demo.png" alt="Demo" width="400" />
</p>

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
IMMICH_ALBUM_ID=<album_id_for_likes_and_superlikes>
```

Notes:
- IMMICH_URL is your Immich base URL (no trailing slash). It is also exposed to the client for deep-linking to Immich Web.
- IMMICH_TOKEN is used as the `x-api-key` when the server calls Immich.
- IMMICH_ALBUM_ID is the Immich album to which liked and superliked assets will be added.

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

## Usage and gestures

- Swipe right: Like (adds to IMMICH_ALBUM_ID)
- Swipe left: Dislike (no-op server route for now)
- Swipe up: Superlike (marks as favorite in Immich and adds to IMMICH_ALBUM_ID)
- Swipe down: Options menu (shows the asset ID and actions)
  - Open in Immich (opens Immich Web for the asset)
  - Delete image (deletes the asset from Immich)

A refresh button in the header loads the next card. Bottom controls were removed; gestures drive the experience.

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
  -e IMMICH_ALBUM_ID=your_album_id \
  immich-tinder
```

## API routes (server)

These routes are implemented under `server/api` and run only on the server side.

- GET `/api/random`
  - Returns a random Immich asset with a normalized payload:
    - `id`, `localDateTime`, `takenAt`, and `location` (with `text`, `city`, `state`, `country`, `latitude`, `longitude` when available).

- GET `/api/image?id=ASSET_ID`
  - Streams the preview thumbnail bytes for the given asset ID (Immich `size=preview`).
  - Response headers include `Content-Type: image/jpeg` and an inline `Content-Disposition`.

- POST `/api/like`
  - Adds the asset to your configured Immich album (see `IMMICH_ALBUM_ID`).
  - Body: `{ "id": "ASSET_ID" }`

- POST `/api/dislike`
  - Currently a no-op placeholder that just validates the payload and returns `{ success: true }`.
  - Body: `{ "id": "ASSET_ID" }`

- POST `/api/superlike`
  - Marks the asset as favorite in Immich and adds it to `IMMICH_ALBUM_ID`.
  - Body: `{ "id": "ASSET_ID" }`

- POST `/api/delete`
  - Deletes the asset from Immich. Tries single-asset delete first and falls back to bulk delete if needed.
  - Body: `{ "id": "ASSET_ID" }`

## How it works (high level)

- The client requests a random asset via `/api/random`.
- When an image needs to be displayed, the client requests `/api/image?id=...` which the server proxies to Immich and returns the binary data.
- Likes and superlikes are posted to server routes that update Immich (album add, and favorite for superlike). Dislike is currently a no-op. Deletion is performed via `/api/delete`.

## Troubleshooting

- 400 Missing id in request body: Ensure you send `{ id: "..." }` to `/api/like`, `/api/dislike`, `/api/superlike`, or `/api/delete`.
- 400 Missing ?id parameter: Provide `?id=...` when calling `/api/image`.
- 404 Image not found (from `/api/image`): The asset might be missing or the ID is wrong.
- 500 Server misconfigured: IMMICH_ALBUM_ID is missing (for like/superlike). Set it in environment variables.
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