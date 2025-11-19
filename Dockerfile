FROM node:20-alpine AS builder
WORKDIR /app
ENV NODE_ENV=production

# Enable Corepack and activate pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies based on lockfile (allow lockfile updates inside build)
COPY package.json pnpm-lock.yaml ./
# The project's lockfile is out of sync with package.json in the workspace.
# Allow pnpm to update the lockfile inside the build so install can complete.
RUN pnpm install --no-frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4221

# Ensure pnpm is available in runtime
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy built app and dependencies from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 4221

CMD ["sh", "-c", "pnpm exec next start -p $PORT"]
