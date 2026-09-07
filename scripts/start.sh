#!/bin/bash

# Start script for PM App

echo "Building Docker image..."
docker build -t pm-app .

echo "Starting container..."
mkdir -p "$(pwd)/data"
docker run -d --name pm-container -p 8000:8000 -v "$(pwd)/data:/app/data" --env-file "$(pwd)/.env" pm-app

echo "App started at http://localhost:8000"