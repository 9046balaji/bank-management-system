FROM node:20-alpine AS builder

WORKDIR /app

# Copy root configurations
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY index.html ./

# Install dependencies
RUN npm install

# Copy source code and other root files
COPY src/ src/
COPY components/ components/
COPY views/ views/
COPY *.ts ./
COPY *.tsx ./

# Build the frontend application
ARG VITE_API_URL=http://localhost:5000/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Production server using Nginx
FROM nginx:alpine
# Copy compiled files
COPY --from=builder /app/dist /usr/share/nginx/html
# Copy custom nginx config for React Router fallback
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]