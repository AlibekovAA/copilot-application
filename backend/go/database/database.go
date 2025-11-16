package database

import (
	"backend/config"
	"context"
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"
)

const (
	selectUserQuery = `SELECT user_id, email, name, hashed_password FROM users`
)

func OpenDB(cfg *config.DatabaseConfig) (*sqlx.DB, error) {
	db, err := sqlx.Open("postgres", cfg.URI)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return db, nil
}

type UserRepository struct {
	db *sqlx.DB
}

func NewUserRepository(db *sqlx.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) GetByEmail(email string) (User, error) {
	var user User
	query := selectUserQuery + ` WHERE email = $1`
	err := r.db.Get(&user, query, email)
	return user, err
}

func (r *UserRepository) GetByID(userID int64) (User, error) {
	var user User
	query := selectUserQuery + ` WHERE user_id = $1`
	err := r.db.Get(&user, query, userID)
	return user, err
}

func (r *UserRepository) UpdatePassword(user User) error {
	query := `UPDATE users SET hashed_password = :hashed_password WHERE user_id = :user_id`
	_, err := r.db.NamedExec(query, user)
	return err
}

func (r *UserRepository) Create(user User) error {
	tx, err := r.db.Beginx()
	if err != nil {
		return err
	}

	query := `INSERT INTO users (email, hashed_password, name) VALUES ($1, $2, $3) RETURNING user_id`
	err = tx.QueryRowx(query, user.Email, user.HashedPassword, user.Name).Scan(&user.ID)
	if err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}
