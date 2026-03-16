FROM node:20-alpine

WORKDIR /app

# Copy package configurations
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY src/ src/

# Build TypeScript to JavaScript
RUN npm run build

EXPOSE 5000

# Start compiled dist version
CMD ["npm", "start"]