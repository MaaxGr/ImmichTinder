# Multi-stage Dockerfile for Nuxt 4 (Nitro) app
# Build stage
FROM node:22-alpine AS build

# Install OS packages if needed by dependencies (kept minimal)
# RUN apk add --no-cache libc6-compat

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# Copy the rest of the project
COPY . .

# Build the project (Nitro output in .output)
RUN npm run build

# Runtime stage
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    NITRO_PORT=3000

# Copy built output only (no dev files)
COPY --from=build /app/.output ./.output

# Non-root user for security
# Alpine's node image already has a node user
USER node

EXPOSE 3000

# Important runtime envs are provided at container start (e.g., IMMICH_URL, IMMICH_TOKEN)
# docker run -e IMMICH_URL=... -e IMMICH_TOKEN=...
CMD ["node", ".output/server/index.mjs"]
