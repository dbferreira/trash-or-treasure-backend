# Base stage
FROM node:22-slim AS base
WORKDIR /app
COPY package*.json ./

# Dependencies stage
FROM base AS deps
RUN npm install

# Build stage
FROM deps AS builder
COPY . .
RUN npm run build

# Production stage
FROM node:22-slim AS runner
WORKDIR /app

# Copy built assets and necessary files
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.mastra ./.mastra
COPY --from=builder /app/node_modules ./node_modules

# Mastra default port is 4111
EXPOSE 4111

# Set production environment
ENV NODE_ENV=production

# Start Mastra
CMD ["npm", "run", "start"]
