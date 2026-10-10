FROM node:24-slim

# Install OpenSSL for Prisma engine
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency specifications and Prisma config
COPY package*.json prisma.config.ts ./
COPY prisma ./prisma

# Install dependencies and generate Prisma Client
RUN npm install
RUN npx prisma generate

# Copy runtime application files
COPY server ./server
COPY assets ./assets
COPY data ./data
COPY *.html *.css *.js ./

# Default environment configuration
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server/server.mjs"]
