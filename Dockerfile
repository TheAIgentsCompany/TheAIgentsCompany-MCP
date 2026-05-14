FROM python:3.12-slim-bookworm

WORKDIR /app

# Installer les dépendances système
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copier et installer le package
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN pip install --no-cache-dir -e .

EXPOSE 8000

# Par défaut : HTTP (SSE) sur le port 8000
# Les données sont montées via volume, configurées via MCP_PROJECTS_DIR
# Usage : docker run -p 8000:8000 -v /host/projects:/data/projects -e MCP_PROJECTS_DIR=/data/projects theaigentscompany/mcp
ENV MCP_PROJECTS_DIR=/app/data/projects
ENV MCP_SKILLS_DIR=/app/data/skills

CMD ["python", "-m", "theaigentscompany_mcp", "--transport", "sse"]
