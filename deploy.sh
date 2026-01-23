#!/bin/bash
set -e

echo "Pulling repo..."
git pull origin main

echo "Installing deps..."
yarn install --frozen-lockfile

echo "Building..."
yarn build

echo "Restarting containers..."
docker compose down
docker compose up -d --build
