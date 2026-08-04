FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm install --omit=dev --legacy-peer-deps

COPY src/ src/

ENV NODE_ENV=production

# Set directory permissions for non-root user
RUN chown -R node:node /app
USER node

EXPOSE 5000

CMD ["npm", "start"]