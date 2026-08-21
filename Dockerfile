FROM node:20-slim

WORKDIR /app

# Install dependencies for native modules (e.g. better-sqlite3) and Prisma (openssl)
# node-slim is Debian based, so we use apt-get instead of apk
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libsqlite3-dev \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy application source
COPY . .

# Generate Prisma Client for SQLite
RUN npx prisma generate

# Build Next.js app
RUN npm run build

# Expose port
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

# Start production server
CMD ["npm", "start"]
