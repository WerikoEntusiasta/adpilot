FROM node:20-slim

WORKDIR /app

# OpenSSL is needed by Prisma query engine
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy package files (no lock file — fresh install)
COPY package.json ./

# Install dependencies
RUN npm install

# Copy application source
COPY . .

# Set database URL for Prisma generate and Next.js build
ENV DATABASE_URL="file:./dev.db"

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js
RUN npm run build

# Expose port
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["npm", "start"]
