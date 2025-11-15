package application

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gorilla/mux"
	"github.com/jmoiron/sqlx"
	_ "github.com/mattn/go-sqlite3"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Тестовая структура для управления состоянием
type testApp struct {
	app    *Application
	db     *sql.DB
	router *mux.Router
}

// setup создаёт тестовое приложение с SQLite в памяти
func setup(t *testing.T) *testApp {
	// Создаём временную БД в памяти
	db, err := sql.Open("sqlite3", ":memory:")
	require.NoError(t, err)

	// Создаём таблицу
	_, err = db.Exec(`
		CREATE TABLE users (
			user_id INTEGER PRIMARY KEY AUTOINCREMENT,
			email TEXT UNIQUE NOT NULL,
			name TEXT NOT NULL,
			hashed_password TEXT NOT NULL
		)`)
	require.NoError(t, err)

	app := &Application{
		DB:        &sqlx.DB{DB: db}, // Оборачиваем *sql.DB в *sqlx.DB
		Router:    mux.NewRouter(),
		JWTSecret: []byte("test-secret-32-bytes-long!1234"), // 32 байта для HS256
	}

	// Регистрируем обработчики
	app.RegisterHandlers()

	return &testApp{
		app:    app,
		db:     db,
		router: app.Router,
	}
}

// cleanup закрывает БД
func (ta *testApp) cleanup() {
	ta.db.Close()
}

// Утилита для отправки JSON-запросов
func doRequest(t *testing.T, router http.Handler, method, path string, body interface{}) *httptest.ResponseRecorder {
	var buf bytes.Buffer
	if body != nil {
		err := json.NewEncoder(&buf).Encode(body)
		require.NoError(t, err)
	}

	req := httptest.NewRequest(method, path, &buf)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)
	return rr
}

// Утилита для извлечения токена из ответа логина
func extractToken(t *testing.T, rr *httptest.ResponseRecorder) string {
	var res struct {
		Token string `json:"token"`
	}
	err := json.Unmarshal(rr.Body.Bytes(), &res)
	require.NoError(t, err)
	return res.Token
}

// ============ ТЕСТЫ ============

func TestHealthCheck(t *testing.T) {
	ta := setup(t)
	defer ta.cleanup()

	rr := doRequest(t, ta.router, "GET", "/health", nil)

	assert.Equal(t, http.StatusOK, rr.Code)
	var res map[string]string
	err := json.Unmarshal(rr.Body.Bytes(), &res)
	require.NoError(t, err)
	assert.Equal(t, "ok", res["status"])
}

func TestRegister(t *testing.T) {
	ta := setup(t)
	defer ta.cleanup()

	// Регистрация нового пользователя
	req := RegisterRequest{
		Email:    "test@example.com",
		Password: "password123",
		Name:     "Test User",
	}
	rr := doRequest(t, ta.router, "POST", "/register", req)

	assert.Equal(t, http.StatusCreated, rr.Code)
	var res struct {
		Message string `json:"message"`
		User    User   `json:"user"`
	}
	err := json.Unmarshal(rr.Body.Bytes(), &res)
	require.NoError(t, err)
	assert.Equal(t, "User created successfully", res.Message)
	assert.Equal(t, "test@example.com", res.User.Email)
	assert.Equal(t, "Test User", res.User.Name)
	assert.Greater(t, res.User.ID, int64(0))
}

func TestRegisterDuplicateEmail(t *testing.T) {
	ta := setup(t)
	defer ta.cleanup()

	req := RegisterRequest{
		Email:    "dup@example.com",
		Password: "pass1",
		Name:     "Dup",
	}

	// Первый раз — OK
	rr1 := doRequest(t, ta.router, "POST", "/register", req)
	assert.Equal(t, http.StatusCreated, rr1.Code)

	// Второй раз — конфликт
	rr2 := doRequest(t, ta.router, "POST", "/register", req)
	assert.Equal(t, http.StatusConflict, rr2.Code)
	var errRes ErrorResponse
	json.Unmarshal(rr2.Body.Bytes(), &errRes)
	assert.Equal(t, "email already exists", errRes.Error)
}

func TestLogin(t *testing.T) {
	ta := setup(t)
	defer ta.cleanup()

	// Сначала регистрируем
	regReq := RegisterRequest{
		Email:    "login@test.com",
		Password: "mypass",
		Name:     "Login User",
	}
	rrReg := doRequest(t, ta.router, "POST", "/register", regReq)
	assert.Equal(t, http.StatusCreated, rrReg.Code)

	// Теперь логинимся
	loginReq := LoginRequest{
		Email:    "login@test.com",
		Password: "mypass",
	}
	rr := doRequest(t, ta.router, "POST", "/login", loginReq)

	assert.Equal(t, http.StatusOK, rr.Code)
	var res struct {
		Token string `json:"token"`
	}
	err := json.Unmarshal(rr.Body.Bytes(), &res)
	require.NoError(t, err)
	assert.NotEmpty(t, res.Token)
}

func TestLoginInvalidCredentials(t *testing.T) {
	ta := setup(t)
	defer ta.cleanup()

	// Регистрируем
	doRequest(t, ta.router, "POST", "/register", RegisterRequest{
		Email:    "bad@test.com",
		Password: "realpass",
		Name:     "Bad",
	})

	// Неверный пароль
	rr1 := doRequest(t, ta.router, "POST", "/login", LoginRequest{
		Email:    "bad@test.com",
		Password: "wrong",
	})
	assert.Equal(t, http.StatusUnauthorized, rr1.Code)

	// Несуществующий email
	rr2 := doRequest(t, ta.router, "POST", "/login", LoginRequest{
		Email:    "notfound@test.com",
		Password: "any",
	})
	assert.Equal(t, http.StatusUnauthorized, rr2.Code)
}

func TestProfileProtected(t *testing.T) {
	ta := setup(t)
	defer ta.cleanup()

	// Регистрируем и логинимся
	doRequest(t, ta.router, "POST", "/register", RegisterRequest{
		Email:    "profile@test.com",
		Password: "profilepass",
		Name:     "Profile User",
	})

	rrLogin := doRequest(t, ta.router, "POST", "/login", LoginRequest{
		Email:    "profile@test.com",
		Password: "profilepass",
	})
	token := extractToken(t, rrLogin)

	// Запрос к /api/profile с токеном
	req := httptest.NewRequest("GET", "/api/profile", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rr := httptest.NewRecorder()
	ta.router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	var profile map[string]interface{}
	err := json.Unmarshal(rr.Body.Bytes(), &profile)
	require.NoError(t, err)
	assert.Equal(t, float64(1), profile["user_id"]) // SQLite AUTOINCREMENT начинается с 1
	assert.Equal(t, "profile@test.com", profile["email"])
}

func TestProfileWithoutToken(t *testing.T) {
	ta := setup(t)
	defer ta.cleanup()

	rr := doRequest(t, ta.router, "GET", "/api/profile", nil)
	assert.Equal(t, http.StatusUnauthorized, rr.Code)
}

func TestChangePassword(t *testing.T) {
	ta := setup(t)
	defer ta.cleanup()

	email := "change@test.com"
	oldPass := "old123"
	newPass := "new456"

	// Регистрация
	doRequest(t, ta.router, "POST", "/register", RegisterRequest{
		Email:    email,
		Password: oldPass,
		Name:     "Changer",
	})

	// Логин
	rrLogin := doRequest(t, ta.router, "POST", "/login", LoginRequest{
		Email:    email,
		Password: oldPass,
	})
	token := extractToken(t, rrLogin)

	// Смена пароля
	changeReq := ChangePasswordRequest{
		OldPassword: oldPass,
		NewPassword: newPass,
	}
	req := httptest.NewRequest("POST", "/api/changepassword", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	json.NewEncoder(req.Body).Encode(changeReq)

	rr := httptest.NewRecorder()
	ta.router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	var res map[string]string
	json.Unmarshal(rr.Body.Bytes(), &res)
	assert.Equal(t, "password updated successfully", res["message"])

	// Проверяем, что можно залогиниться с новым паролем
	rrNewLogin := doRequest(t, ta.router, "POST", "/login", LoginRequest{
		Email:    email,
		Password: newPass,
	})
	assert.Equal(t, http.StatusOK, rrNewLogin.Code)
}

func TestChangePasswordWrongOldPassword(t *testing.T) {
	ta := setup(t)
	defer ta.cleanup()

	// Регистрация и логин
	doRequest(t, ta.router, "POST", "/register", RegisterRequest{
		Email:    "wrongold@test.com",
		Password: "correct",
		Name:     "Wrong",
	})
	rrLogin := doRequest(t, ta.router, "POST", "/login", LoginRequest{
		Email:    "wrongold@test.com",
		Password: "correct",
	})
	token := extractToken(t, rrLogin)

	// Попытка смены с неправильным старым паролем
	req := httptest.NewRequest("POST", "/api/changepassword", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	json.NewEncoder(req.Body).Encode(ChangePasswordRequest{
		OldPassword: "wrong",
		NewPassword: "newpass",
	})

	rr := httptest.NewRecorder()
	ta.router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusUnauthorized, rr.Code)
}
