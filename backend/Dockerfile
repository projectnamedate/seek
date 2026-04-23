# Seek backend - production Docker image for Railway / Fly.io / Fargate.
# Multi-stage build: compile TypeScript, ship a slim runtime image.

FROM node:20-alpine AS builder
WORKDIR /app

# Install deps (use npm ci for reproducibility when package-lock.json exists)
COPY package*.json ./
RUN npm ci

# Build the TypeScript sources
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- Runtime image ----
FROM node:20-alpine AS runtime
WORKDIR /app

# Non-root user for defence-in-depth
RUN addgroup -S seek && adduser -S seek -G seek

# Install production deps only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built artifacts
COPY --from=builder /app/dist ./dist

USER seek

# Railway injects PORT at runtime; default for local testing.
ENV PORT=3001
EXPOSE 3001

# Healthcheck — Railway polls this if configured
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:${PORT}/api/health || exit 1

CMD ["node", "dist/index.js"]
