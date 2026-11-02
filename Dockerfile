# Multi-stage Dockerfile for ChatSphere Real-time Chat Application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package descriptors
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm --prefix backend install --omit=dev
RUN npm --prefix frontend install

# Copy source files
COPY . .

# Build frontend production bundle
RUN npm --prefix frontend run build

# Production runner stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

# Copy node modules and built assets
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/frontend/dist ./frontend/dist

# Expose server port
EXPOSE 5000

# Start server
CMD ["node", "backend/src/server.js"]

