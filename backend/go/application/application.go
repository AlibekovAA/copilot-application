package application

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gorilla/mux"
	"github.com/jmoiron/sqlx"

	"backend/config"
	"backend/database"
	"backend/logger"
)

type Application struct {
	DB          *sqlx.DB
	userRepo    *database.UserRepository
	Router      *mux.Router
	Addr        string
	JWTSecret   []byte
	CORSOrigins []string
	logger      *logger.Logger
	authLimiter *authLimiter
}

func NewApplication() *Application {
	return &Application{
		Router: mux.NewRouter(),
	}
}

func (app *Application) Configure(logger *logger.Logger, cfg *config.Config) error {
	app.logger = logger
	if cfg.JWTSecret == "" {
		return errors.New("JWT_SECRET must not be empty")
	}
	if cfg.AuthMaxConcurrent <= 0 || cfg.AuthMaxQueued <= 0 {
		return errors.New("authentication concurrency and queue limits must be positive")
	}

	db, err := database.OpenDB(&cfg.Database, logger)
	if err != nil {
		app.logger.Errorf("Failed to open database: %v", err)
		return err
	}

	app.DB = db
	app.userRepo = database.NewUserRepository(db, logger)
	app.Addr = cfg.Addr
	app.JWTSecret = []byte(cfg.JWTSecret)
	app.CORSOrigins = cfg.CORSOrigins
	app.authLimiter = newAuthLimiter(cfg.AuthMaxConcurrent, cfg.AuthMaxQueued)

	return nil
}

func (app *Application) Shutdown() error {
	if app.DB != nil {
		app.logger.Info("Closing database connection...")
		if err := app.DB.Close(); err != nil {
			app.logger.Errorf("Error closing database: %v", err)
			return err
		}
		app.logger.Info("Database connection closed successfully")
	}
	return nil
}

func (app *Application) RegisterHandlers() {
	app.Router.HandleFunc("/health", app.healthHandler).Methods("GET")
	app.Router.Handle("/register", app.limitAuthRequests(http.HandlerFunc(app.registerHandler))).Methods("POST")
	app.Router.Handle("/login", app.limitAuthRequests(http.HandlerFunc(app.loginHandler))).Methods("POST")

	api := app.Router.PathPrefix("/api").Subrouter()
	api.Use(app.authMiddleware)

	api.HandleFunc("/profile", app.profileHandler).Methods("GET")
	api.Handle("/change-password", app.limitAuthRequests(http.HandlerFunc(app.changePasswordHandler))).Methods("POST")
}

func (app *Application) Run() error {
	app.RegisterHandlers()

	handler := app.corsMiddleware(app.Router)

	server := &http.Server{
		ErrorLog:       log.New(app.logger, "HTTP server: ", 0),
		Addr:           app.Addr,
		Handler:        handler,
		ReadTimeout:    15 * time.Second,
		WriteTimeout:   15 * time.Second,
		IdleTimeout:    60 * time.Second,
		MaxHeaderBytes: 1 << 20,
	}

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	defer signal.Stop(stop)

	serverErr := make(chan error, 1)

	go func() {
		app.logger.Infof("Backend is running on %s", app.Addr)
		serverErr <- server.ListenAndServe()
	}()

	var runErr error
	select {
	case err := <-serverErr:
		if err != nil && err != http.ErrServerClosed {
			app.logger.Errorf("Failed to start backend: %v", err)
			runErr = fmt.Errorf("failed to start backend: %w", err)
		}
	case <-stop:
		app.logger.Info("Shutting down backend...")
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		app.logger.Errorf("Server shutdown error: %v", err)
		runErr = errors.Join(runErr, fmt.Errorf("server shutdown failed: %w", err))
	}

	if err := app.Shutdown(); err != nil {
		app.logger.Errorf("Application shutdown error: %v", err)
		runErr = errors.Join(runErr, fmt.Errorf("application shutdown failed: %w", err))
	}

	if runErr != nil {
		return runErr
	}

	app.logger.Info("Backend terminated correctly")
	return nil
}

func (app *Application) corsMiddleware(next http.Handler) http.Handler {
	allowedOrigins := make(map[string]bool)
	for _, origin := range app.CORSOrigins {
		allowedOrigins[origin] = true
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if allowedOrigins[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		}

		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
