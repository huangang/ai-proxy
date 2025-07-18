# syntax=docker/dockerfile:1

# Build Stage
FROM node:22-slim AS builder
WORKDIR /app
RUN npm i -g bun

# Copy package files and install dependencies
COPY package*.json ./
RUN bun i

# Copy the rest of the application source code
COPY . .

# Build the TypeScript project
# Assumes you have a "build" script in your package.json, e.g., "tsc -p tsconfig.json"
RUN bun run build

# Production Stage
FROM node:22-slim AS production
WORKDIR /app

RUN apt-get update && apt-get install -y \
    curl

RUN npm i -g bun

# Copy package.json
COPY package.json ./

# Install production dependencies only
RUN bun i --prod

# Copy built code from the builder stage
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=3000

# Command to run the application
# Assumes your entry point after build is dist/main.js
CMD ["bun", "start"]