package application

import (
	"backend/config"
	"backend/database"
	"backend/logger"
	"context"
	"errors"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gorilla/mux"
	"github.com/jmoiron/sqlx"
)

type Application struct {
	DB         *sqlx.DB
	userRepo   *database.UserRepository
	Router     *mux.Router
	Addr       string
	JWTSecret  []byte
	logger     *logger.Logger
}

func NewApplication() *Application {
	return &Application{
		Router: mux.NewRouter(),
	}
}

func (app *Application) Configure(ctx context.Context, logger *logger.Logger, cfg *config.Config) error {
	app.logger = logger

	db, err := database.OpenDB(&cfg.Database)
	if err != nil {
		app.logger.Errorf("error %v", err)
		return err
	}

	app.DB = db
	app.userRepo = database.NewUserRepository(db)
	app.Addr = cfg.Addr
	app.JWTSecret = []byte(cfg.JWTSecret)

	if len(app.JWTSecret) == 0 {
		return errors.New("JWT_SECRET must not be empty")
	}

	return nil
}

func (app *Application) RegisterHandlers() {
	app.Router.HandleFunc("/health", app.healthHandler).Methods("GET")
	app.Router.HandleFunc("/register", app.registerHandler).Methods("POST")
	app.Router.HandleFunc("/login", app.loginHandler).Methods("POST")

	api := app.Router.PathPrefix("/api").Subrouter()
	api.Use(app.authMiddleware)

	api.HandleFunc("/profile", app.profileHandler).Methods("GET")
	api.HandleFunc("/change-password", app.changePasswordHandler).Methods("POST")
}

func (app *Application) Run(ctx context.Context) {
	app.RegisterHandlers()

	handler := corsMiddleware(app.Router)

	server := &http.Server{
		Addr:    app.Addr,
		Handler: handler,
	}

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	serverErr := make(chan error, 1)

	go func() {
		app.logger.Infof("Backend is running on %s", app.Addr)
		serverErr <- server.ListenAndServe()
	}()

	select {
	case err := <-serverErr:
		if err != nil && err != http.ErrServerClosed {
			app.logger.Fatalf("Failed to start backend: %v", err)
		}
	case <-stop:
		app.logger.Info("Shutting down backend...")
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		app.logger.Errorf("Server shutdown error: %v", err)
	}

	app.logger.Info("Backend terminated correctly")
}

func corsMiddleware(next http.Handler) http.Handler {
	allowedOrigins := map[string]bool{
		"http://frontend_app:3000": true,
		"http://localhost:3000":    true,
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
