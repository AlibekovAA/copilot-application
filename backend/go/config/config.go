package config

import (
	"os"

	"github.com/caarlos0/env/v11"
	"github.com/joho/godotenv"

	"backend/logger"
)

type Config struct {
	LogLevel   logger.LogLevel `env:"LOG_LEVEL" envDefault:"1"`
	LogDir     string          `env:"LOG_DIR" envDefault:"./logs"`
	Database   DatabaseConfig  `envPrefix:"DATABASE_"`
	Addr       string          `env:"ADDR" envDefault:":8080"`
	JWTSecret  string          `env:"JWT_SECRET"`
	CORSOrigins []string       `env:"CORS_ORIGINS" envSeparator:"," envDefault:"http://localhost:3000,http://frontend_app:3000"`
}

type DatabaseConfig struct {
	URI string `env:"URI"`
}

func Load() (*Config, error) {
	if err := godotenv.Load("../../.env"); err != nil {
		if !os.IsNotExist(err) {
			return nil, err
		}
	}

	var cfg Config
	if err := env.Parse(&cfg); err != nil {
		return nil, err
	}

	return &cfg, nil
}
