#!/bin/bash
echo "Setting up TubeToMD workspace..."

# Backend
echo "Installing backend dependencies..."
cd backend
cp .env.example .env
npm install
cd ..

# Frontend
echo "Installing frontend dependencies..."
cd frontend
cp .env.example .env
npm install
cd ..

# Python
echo "Installing python dependencies..."
cd python
cp .env.example .env
pip install -r requirements.txt
pip install pytest httpx
cd ..

echo "TubeToMD workspace is ready!"
