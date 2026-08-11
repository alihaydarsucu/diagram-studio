FROM node:24-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build the static site
RUN pnpm build

# Production stage - use nginx to serve static files
FROM nginx:alpine

# Copy built files to nginx
COPY --from=builder /app/docs /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
