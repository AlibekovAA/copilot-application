package database

import (
	"backend/config"

	"github.com/jmoiron/sqlx"
)

func OpenDB(cfg *config.DatabaseConfig) (*sqlx.DB, error) {
	db, err := sqlx.Open("postgres", cfg.URI)
	if err != nil {
		return nil, err
	}

	return db, nil
}

func GetUserByEmail(email string, db *sqlx.DB) (User, error) {
	var user User
	err := db.Get(&user, `SELECT * FROM users WHERE email = $1`, email)
	return user, err
}

func GetUserByID(userID int, db *sqlx.DB) (User, error) {
	var user User
	err := db.Get(&user, `SELECT * FROM users WHERE user_id = $1`, userID)
	return user, err
}

func UpdateUserPassword(user User, db *sqlx.DB) error {
	query := `UPDATE users SET hashed_password = :hashed_password WHERE id = :id`
	_, err := db.NamedExec(query, user)
	return err
}

func CreateUser(user User, db *sqlx.DB) error {
	tx, err := db.Beginx()
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
