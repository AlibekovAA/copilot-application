FROM python:3.13-slim

WORKDIR /app

RUN apt-get update && apt-get install -y make gcc libc6-dev curl && rm -rf /var/lib/apt/lists/*

RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --upgrade pip && \
    pip install poetry

COPY pyproject.toml poetry.lock* /app/

RUN --mount=type=cache,target=/root/.cache/pypoetry \
    poetry config virtualenvs.create false && \
    poetry install --no-root --no-interaction --no-ansi --only main

COPY . /app

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD curl -f http://localhost:8000/health || exit 1

CMD ["poetry", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
