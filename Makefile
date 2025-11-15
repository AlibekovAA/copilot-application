ifeq ($(OS),Windows_NT)
    DOCKER_COMPOSE = docker-compose
    SET_ENV = set DOCKER_BUILDKIT=1& set COMPOSE_DOCKER_CLI_BUILD=1&
else
    ifeq ($(shell command -v docker-compose 2> /dev/null),)
        DOCKER_COMPOSE = docker compose
    else
        DOCKER_COMPOSE = docker-compose
    endif
    SET_ENV = DOCKER_BUILDKIT=1 COMPOSE_DOCKER_CLI_BUILD=1
endif

.PHONY: format down up reup rebuild help

down:
	@echo "Stopping containers..."
	$(DOCKER_COMPOSE) down -v
	@echo "Done!"

up:
	@echo "Starting containers with build..."
	$(SET_ENV) $(DOCKER_COMPOSE) up --build

reup:
	@echo "Removing containers and volumes..."
	$(DOCKER_COMPOSE) down -v
	@echo "Starting containers with build..."
	$(SET_ENV) $(DOCKER_COMPOSE) up --build

rebuild:
	@echo "Rebuilding images with no cache..."
	$(SET_ENV) $(DOCKER_COMPOSE) build --no-cache
	@echo "Starting containers..."
	$(DOCKER_COMPOSE) up -d

clean:
	@echo "Stopping all containers..."
	-docker stop $$(docker ps -a -q) 2>/dev/null || true
	@echo "Removing all containers..."
	-docker rm $$(docker ps -a -q) 2>/dev/null || true
	@echo "Removing all images..."
	-docker rmi $$(docker images -q) 2>/dev/null || true
	@echo "Pruning Docker system..."
	docker system prune -a --volumes -f
	@echo "Docker cleanup complete!"

help:
	@echo "Available targets:"
	@echo "  down    - Stop and remove containers and volumes"
	@echo "  up      - Start containers with build (uses cache)"
	@echo "  reup    - Full restart (remove volumes + rebuild with cache)"
	@echo "  rebuild - Rebuild images without cache (slower, fresh build)"
	@echo "  clean   - Remove ALL Docker containers, images, and volumes"
	@echo "  help    - Show this help message"
