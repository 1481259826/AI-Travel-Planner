# Multi-stage build for Next.js application
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments for environment variables
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_MAP_API_KEY
ARG NEXT_PUBLIC_MAP_SECURITY_KEY
ARG NEXT_PUBLIC_BASE_URL

# Set environment variables for build
ENV NODE_ENV=production
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_MAP_API_KEY=$NEXT_PUBLIC_MAP_API_KEY
ENV NEXT_PUBLIC_MAP_SECURITY_KEY=$NEXT_PUBLIC_MAP_SECURITY_KEY
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
RUN npm run build

# Verify standalone output was created
RUN test -d .next/standalone || (echo "ERROR: Standalone output not found" && exit 1)

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

# Re-declare build arguments for runtime
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG SUPABASE_SERVICE_ROLE_KEY
ARG ENCRYPTION_KEY
ARG NEXT_PUBLIC_MAP_API_KEY
ARG NEXT_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_MAP_SECURITY_KEY
ARG DEEPSEEK_API_KEY
ARG DEEPSEEK_BASE_URL
ARG MODELSCOPE_API_KEY
ARG MODELSCOPE_BASE_URL
ARG AMAP_WEB_SERVICE_KEY

# Set environment variables for runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
ENV ENCRYPTION_KEY=$ENCRYPTION_KEY
ENV NEXT_PUBLIC_MAP_API_KEY=$NEXT_PUBLIC_MAP_API_KEY
ENV NEXT_PUBLIC_MAP_SECURITY_KEY=$NEXT_PUBLIC_MAP_SECURITY_KEY
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
ENV DEEPSEEK_API_KEY=$DEEPSEEK_API_KEY
ENV DEEPSEEK_BASE_URL=$DEEPSEEK_BASE_URL
ENV MODELSCOPE_API_KEY=$MODELSCOPE_API_KEY
ENV MODELSCOPE_BASE_URL=$MODELSCOPE_BASE_URL
ENV AMAP_WEB_SERVICE_KEY=$AMAP_WEB_SERVICE_KEY

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public folder
COPY --from=builder /app/public ./public

# Copy standalone server and dependencies
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Verify server.js exists
RUN ls -la && test -f server.js || (echo "ERROR: server.js not found" && ls -la && exit 1)

USER nextjs

# Expose port
EXPOSE 3008

ENV PORT=3008
ENV HOSTNAME="0.0.0.0"

# Start the application
CMD ["node", "server.js"]
