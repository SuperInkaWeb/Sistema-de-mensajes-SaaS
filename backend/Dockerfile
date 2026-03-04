FROM node:20-alpine

# OpenSSL es requerido por Prisma en Alpine
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Create uploads directory
RUN mkdir -p uploads sessions

EXPOSE 3001

CMD ["node", "dist/index.js"]
