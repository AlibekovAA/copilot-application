ifeq ($(OS),Windows_NT)
    DOCKER_COMPOSE = docker-compose
else
    ifeq ($(shell command -v docker-compose 2> /dev/null),)
        DOCKER_COMPOSE = docker compose
    else
        DOCKER_COMPOSE = docker-compose
    endif
endif

.PHONY: format down up reup restart rebuild help

down:
	@echo "Stopping containers..."
	$(DOCKER_COMPOSE) down
	@echo "Done!"

down-volumes:
	@echo "Stopping containers and removing volumes..."
	$(DOCKER_COMPOSE) down -v
	@echo "Done!"

up:
	@echo "Starting containers..."
	$(DOCKER_COMPOSE) up

up-build:
	@echo "Starting containers with build..."
	$(DOCKER_COMPOSE) up --build

restart:
	@echo "Restarting containers (keeps volumes and cache)..."
	$(DOCKER_COMPOSE) restart
	@echo "Done!"

reup:
	@echo "Stopping containers (keeping volumes)..."
	$(DOCKER_COMPOSE) down
	@echo "Starting containers with build..."
	$(DOCKER_COMPOSE) up --build

rebuild:
	@echo "Rebuilding images with no cache..."
	$(DOCKER_COMPOSE) build --no-cache
	@echo "Starting containers..."
	$(DOCKER_COMPOSE) up

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
	@echo "  up           - Start containers (fast, no build)"
	@echo "  up-build     - Start containers with build"
	@echo "  down         - Stop containers (keeps volumes)"
	@echo "  down-volumes - Stop containers and remove volumes (database will be removed!)"
	@echo "  restart      - Restart containers (fastest, keeps everything)"
	@echo "  reup         - Stop + rebuild + start (keeps volumes/database)"
	@echo "  rebuild      - Full rebuild without cache (slowest)"
	@echo "  clean        - Remove ALL Docker containers, images, and volumes"
	@echo "  help         - Show this help message"
