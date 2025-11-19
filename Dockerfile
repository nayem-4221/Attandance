# Production container for attendance-tracker
# Node 20 on Alpine for small image size
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install only production deps first (for better layer caching)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the rest of the app
COPY . .

# Environment
ENV NODE_ENV=production \
    PORT=42212

# Expose runtime port
EXPOSE 42212

# Start the server
CMD ["node", "src/server.js"]
