# Base stage
FROM node:22-slim AS base
WORKDIR /app
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Dependencies stage
FROM base AS deps
RUN npm install
RUN cd frontend && npm install

# Build stage
FROM deps AS builder
COPY . .
RUN npm run build
RUN cd frontend && npm run build

# Production stage
FROM node:22-slim AS runner
WORKDIR /app

# Copy built assets and necessary files
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.mastra ./.mastra
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/frontend ./frontend

# Mastra default port is 4111
EXPOSE 4111
# Vite preview default port
EXPOSE 5173

# Set production environment
ENV NODE_ENV=production

# Start Mastra and frontend preview server
CMD ["sh", "-c", "./node_modules/.bin/concurrently \"npm run start\" \"cd frontend && npm run preview -- --host 0.0.0.0 --port 5173\""]
