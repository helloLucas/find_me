FROM python:3.11-slim

WORKDIR /app

# 시스템 의존성 설치 (psycopg2 빌드를 위해 필요할 수 있음)
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

CMD ["python", "main.py"]
