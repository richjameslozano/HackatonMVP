# Stage: Production image
FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set working directory
WORKDIR /app

# Copy requirements first for Docker layer caching
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/

# Expose the application port
EXPOSE 8000

# Run uvicorn with single worker (WebSocket in-memory state requires single process)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
