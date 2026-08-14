FROM node:20-alpine

WORKDIR /app

COPY --chown=node:node package*.json ./
COPY --chown=node:node tsconfig.json ./

RUN npm install --omit=dev --legacy-peer-deps

COPY --chown=node:node src/ src/

ENV NODE_ENV=production

USER node

EXPOSE 5000

CMD ["npm", "start"]