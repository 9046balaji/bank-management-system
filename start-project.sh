#!/bin/bash

echo "Starting Aura Bank Platform..."

# Check if docker is available
if ! command -v docker &> /dev/null; then
    echo "Docker is not recognized. Please install Docker and start it."
    exit 1
fi

# Start services with docker-compose
echo "Building and bringing up Docker containers..."
docker compose up -d --build

echo ""
echo "======================================================="
echo "Aura Bank Fintech Ecosystem is starting!"
echo "======================================================="
echo "Frontend: http://localhost:3000"
echo "Backend API: http://localhost:5000"
echo "Database: localhost:5432"
echo ""
echo "Use 'docker compose logs -f' to see live logs."
echo "Use 'docker compose down' to stop services."