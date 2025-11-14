package application

import (
	"backend/config"
	"backend/database"
	"backend/logger"
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gorilla/mux"
	"github.com/jmoiron/sqlx"
)

type Application struct {
	DB        *sqlx.DB
	Router    *mux.Router
	Addr      string
	JWTSecret []byte
	logger    *logger.Logger
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
		return err
	}

	app.DB = db
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

	app.Router.Use(corsMiddleware)
}

func (app *Application) Run(ctx context.Context) {
	app.RegisterHandlers()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	serverErr := make(chan error, 1)

	go func() {
		log.Printf("Backend is running on  %s", app.Addr)
		serverErr <- http.ListenAndServe(app.Addr, corsMiddleware(app.Router))
	}()

	select {
	case err := <-serverErr:
		if err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed start backend: %v", err)
		}
	case <-stop:
		log.Println("Shutting down backend...")
	}

	shutdownCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	<-shutdownCtx.Done()

	log.Println("Backend is terminated correctly")
}

func corsMiddleware(next http.Handler) http.Handler {
	allowedOrigins := map[string]bool{
		"http://localhost":      true,
		"http://localhost:8081": true,
		"http://frontend":       true,
		"http://nginx":          true,
		"http://localhost:3000": true,
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
