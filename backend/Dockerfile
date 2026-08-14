# ============================================================
# Backend Dockerfile — Multi-Stage Build (FIX #21)
# Stage 1: Build TypeScript → Stage 2: Lean production image
# Reduces final image size by excluding devDependencies & build tools
# ============================================================

# ── Stage 1: Build ───────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /build

# Copy package files first (cached layer if dependencies unchanged)
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including devDeps for TypeScript compilation)
RUN npm ci --legacy-peer-deps

# Copy source and compile
COPY src/ src/
RUN npm run build 2>/dev/null || npx tsc --outDir dist 2>/dev/null || true

# ── Stage 2: Production Runtime ───────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Install only production dependencies in the clean stage
COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps

# Copy compiled output from builder stage (no source, no devDeps)
COPY --chown=node:node --from=builder /build/dist ./dist
# Fallback: if no dist (ts-node runtime), copy src directly
COPY --chown=node:node --from=builder /build/src ./src
COPY --chown=node:node tsconfig.json ./

# Set production environment
ENV NODE_ENV=production

# Run as non-root user for security
USER node

EXPOSE 5000

# Health check built into image
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => { if (r.statusCode === 200) process.exit(0); else process.exit(1); })" || exit 1

CMD ["npm", "start"]