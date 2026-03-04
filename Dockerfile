FROM node:20-bullseye

# Enable corepack for pnpm/yarn if needed
RUN corepack enable

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./
RUN if [ -f package-lock.json ]; then npm ci; \
    elif [ -f yarn.lock ]; then corepack yarn install --frozen-lockfile; \
    elif [ -f pnpm-lock.yaml ]; then corepack pnpm install --frozen-lockfile; \
    else npm install; fi

# Copy the rest of the project
COPY . .

# Environment
ENV EXPO_NO_TELEMETRY=1 \
    CHOKIDAR_USEPOLLING=true \
    NODE_OPTIONS=--max_old_space_size=4096

# Expose Expo/Metro/Web ports
EXPOSE 19000 19001 19002 8081 19006

# Start with tunnel so devices can connect across networks
CMD ["npm", "run", "start", "--", "--tunnel"]

