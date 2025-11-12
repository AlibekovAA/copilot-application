.PHONY: install format lint type-check run-api run-consumer

install:
	poetry install

format:
	poetry run ruff format app/

lint:
	poetry run ruff check app/ --fix

type-check:
	poetry run mypy app/

run-api:
	poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

run-consumer:
	poetry run python app/consumer.py

docker-build:
	docker build -t copilot-llm-service .

docker-up:
	docker-compose -f python.yml up --build

docker-down:
	docker-compose -f python.yml down

all: format lint type-check
