#!/bin/bash

# Stop script for PM App

echo "Stopping container..."
docker stop pm-container

echo "Removing container..."
docker rm pm-container

echo "App stopped."