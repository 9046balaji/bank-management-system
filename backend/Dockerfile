# Stage 1: Build the backend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package configurations
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including devDependencies needed for TS compilation)
RUN npm install

# Copy source code
COPY src/ src/

# Build TypeScript to JavaScript
RUN npm run build

# Stage 2: Minimal Production Image
FROM node:20-alpine

WORKDIR /app

# Copy only what we need to install production deps
COPY package*.json ./

# Keep image clean: install ONLY production dependencies and clear npm cache
RUN npm install --omit=dev && npm cache clean --force

# Copy only compiled output from builder stage
COPY --from=builder /app/dist ./dist

# Provide environment configurations safely 
ENV NODE_ENV=production

# Security: Run node as an unprivileged user, not as root
USER node

EXPOSE 5000

# Start lightweight compiled dist version instead of running via TS
CMD ["npm", "start"]