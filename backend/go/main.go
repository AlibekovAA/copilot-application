package main

import (
	"backend/application"
	"backend/config"
	"backend/logger"

	_ "github.com/lib/pq"
)

func main() {
	logger := logger.GetInstance()

	cfg, err := config.Load()
	if err != nil {
		logger.Fatalf("config load failed: %v", err)
	}

	if err := logger.Initialize(cfg.LogDir, cfg.LogLevel); err != nil {
		logger.Fatalf("logger initialization failed: %v", err)
	}

	app := application.NewApplication()

	if err := app.Configure(logger, cfg); err != nil {
		logger.Fatalf("Failed to configure application: %v", err)
	}

	app.Run()
}
