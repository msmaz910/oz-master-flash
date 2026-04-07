FROM python:3.12-slim

# Install system dependencies
RUN apt-get update && apt-get install -y nodejs npm && rm -rf /var/lib/apt/lists/*

# Install uv
RUN pip install uv

# Set workdir
WORKDIR /app

# Copy backend requirements first for caching
COPY backend/requirements.txt ./
RUN uv pip install --system -r requirements.txt

# Copy backend code
COPY backend/ ./

# Copy frontend and build it
COPY frontend/ ./frontend/
WORKDIR /app/frontend
RUN npm install
RUN npm run build

# Copy built frontend to backend static
RUN mkdir -p ../static && cp -r out/* ../static/

# Back to root
WORKDIR /app

# Expose port
EXPOSE 8000

# Run FastAPI
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]