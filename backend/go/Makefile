.PHONY: format lint check run

format:
	go fmt ./...

lint:
	staticcheck ./...
	go vet ./...

check: format lint

run:
	go run .
