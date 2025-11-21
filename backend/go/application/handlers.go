package application

import (
	"backend/database"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type ChangePasswordRequest struct {
	OldPassword string `json:"old_password"`
	NewPassword string `json:"new_password"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}

type contextKey string

const (
	userIDKey contextKey = "user_id"
	emailKey  contextKey = "email"
)

func (app *Application) healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)

func (app *Application) registerHandler(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 1024*1024)

	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		app.respondWithError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Email == "" || req.Password == "" || req.Name == "" {
		app.respondWithError(w, http.StatusBadRequest, "missing required fields")
		return
	}

	if !emailRegex.MatchString(req.Email) {
		app.respondWithError(w, http.StatusBadRequest, "invalid email format")
		return
	}

	if len(req.Name) < 2 {
		app.respondWithError(w, http.StatusBadRequest, "name must be at least 2 characters long")
		return
	}

	if len(req.Password) < 8 {
		app.respondWithError(w, http.StatusBadRequest, "password must be at least 8 characters long")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	_, err := app.userRepo.GetByEmail(ctx, req.Email)
	if err == nil {
		app.respondWithError(w, http.StatusConflict, "email already exists")
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		app.logger.Errorf("Password hash error: %v", err)
		app.respondWithError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	user := database.User{
		Email:          req.Email,
		Name:           req.Name,
		HashedPassword: string(hashedPassword),
	}
	err = app.userRepo.Create(ctx, user)

	if err != nil {
		app.logger.Errorf("Registration DB error: %v", err)
		app.respondWithError(w, http.StatusInternalServerError, "registration failed")
		return
	}

	createdUser, err := app.userRepo.GetByEmail(ctx, req.Email)
	if err != nil {
		app.logger.Errorf("Failed to fetch created user: %v", err)
		app.respondWithError(w, http.StatusInternalServerError, "registration failed")
		return
	}

	token, err := app.generateJWT(createdUser.ID, createdUser.Email)
	if err != nil {
		app.logger.Errorf("Token generation error: %v", err)
		app.respondWithError(w, http.StatusInternalServerError, "token generation failed")
		return
	}

	app.respondWithJSON(w, http.StatusCreated, map[string]any{
		"token": token,
		"user": map[string]any{
			"id":    createdUser.ID,
			"email": createdUser.Email,
			"name":  createdUser.Name,
		},
	})
}

func (app *Application) loginHandler(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 1024*1024)

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		app.respondWithError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Email == "" || req.Password == "" {
		app.respondWithError(w, http.StatusBadRequest, "missing required fields")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	user, err := app.userRepo.GetByEmail(ctx, req.Email)
	if err != nil {
		app.respondWithError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.HashedPassword), []byte(req.Password)); err != nil {
		app.respondWithError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	token, err := app.generateJWT(user.ID, user.Email)
	if err != nil {
		app.logger.Errorf("Token generation error: %v", err)
		app.respondWithError(w, http.StatusInternalServerError, "token generation failed")
		return
	}

	app.respondWithJSON(w, http.StatusOK, map[string]any{
		"token": token,
		"user": map[string]any{
			"id":    user.ID,
			"email": user.Email,
			"name":  user.Name,
		},
	})
}

func (app *Application) profileHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok1 := r.Context().Value(userIDKey).(int64)
	email, ok2 := r.Context().Value(emailKey).(string)
	if !ok1 || !ok2 {
		app.respondWithError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	app.respondWithJSON(w, http.StatusOK, map[string]any{
		"user_id": userID,
		"email":   email,
	})
}

func (app *Application) changePasswordHandler(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 1024*1024)

	userID, ok := r.Context().Value(userIDKey).(int64)
	if !ok {
		app.respondWithError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req ChangePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		app.respondWithError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.OldPassword == "" || req.NewPassword == "" {
		app.respondWithError(w, http.StatusBadRequest, "missing required fields")
		return
	}

	if len(req.NewPassword) < 8 {
		app.respondWithError(w, http.StatusBadRequest, "new password must be at least 8 characters long")
		return
	}

	if req.OldPassword == req.NewPassword {
		app.respondWithError(w, http.StatusBadRequest, "new password must be different from old password")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	user, err := app.userRepo.GetByID(ctx, userID)
	if err != nil {
		app.logger.Errorf("User fetch error: %v", err)
		app.respondWithError(w, http.StatusUnauthorized, "user not found")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.HashedPassword), []byte(req.OldPassword)); err != nil {
		app.respondWithError(w, http.StatusUnauthorized, "invalid old password")
		return
	}

	hashedNewPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		app.logger.Errorf("New password hash error: %v", err)
		app.respondWithError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	user.HashedPassword = string(hashedNewPassword)

	err = app.userRepo.UpdatePassword(ctx, user)
	if err != nil {
		app.logger.Errorf("Password update error: %v", err)
		app.respondWithError(w, http.StatusInternalServerError, "failed to update password")
		return
	}

	app.respondWithJSON(w, http.StatusOK, map[string]string{"message": "password updated successfully"})
}

func (app *Application) authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			app.respondWithError(w, http.StatusUnauthorized, "missing authorization header")
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (any, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, errors.New("unexpected signing method")
			}
			return app.JWTSecret, nil
		})

		if err != nil || !token.Valid {
			app.respondWithError(w, http.StatusUnauthorized, "invalid token")
			return
		}

		if claims, ok := token.Claims.(jwt.MapClaims); ok {
			userIDFloat, ok := claims["user_id"].(float64)
			if !ok {
				app.respondWithError(w, http.StatusUnauthorized, "invalid user_id in token")
				return
			}
			userID := int64(userIDFloat)

			email, ok := claims["email"].(string)
			if !ok {
				app.respondWithError(w, http.StatusUnauthorized, "invalid email in token")
				return
			}

			ctx := context.WithValue(r.Context(), userIDKey, userID)
			ctx = context.WithValue(ctx, emailKey, email)
			next.ServeHTTP(w, r.WithContext(ctx))
		} else {
			app.respondWithError(w, http.StatusUnauthorized, "invalid token claims")
		}
	})
}

func (app *Application) respondWithError(w http.ResponseWriter, code int, message string) {
	app.respondWithJSON(w, code, ErrorResponse{Error: message})
}

func (app *Application) respondWithJSON(w http.ResponseWriter, code int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
		if err := json.NewEncoder(w).Encode(payload); err != nil {
		app.logger.Errorf("Failed to encode JSON response: %v", err)
	}
}
