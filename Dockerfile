FROM python:3.12-slim-bookworm

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install the package
COPY . .
RUN pip install --no-cache-dir -e .

EXPOSE 8000

# Start in SSE mode (for remote deployment via Railway / Fly.io / VPS)
CMD ["python", "-m", "theaigents_tracker", "--transport", "sse"]
