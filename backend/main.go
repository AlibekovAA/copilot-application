package main

import (
	"backend/application"
	"backend/config"
	"backend/logger"
	"context"
	"os"
	"os/signal"

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

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	app := application.NewApplication()

	if err := app.Configure(ctx, logger, cfg); err != nil {
		logger.Fatalf("Failed to configure application: %v", err)
	}

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt)
	go func() {
		<-stop
		cancel()
	}()

	app.Run(ctx)
}
