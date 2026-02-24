FROM python:3.12-slim

RUN apt-get update && apt-get install -y \
    libcups2-dev \
    libsane-dev \
    sane-utils \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Allow SANE access without root
RUN usermod -aG scanner root 2>/dev/null || true

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
