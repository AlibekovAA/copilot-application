package database

type User struct {
	ID             int    `db:"user_id" json:"user_id"`
	Name           string `db:"name" json:"name"`
	Email          string `db:"email" json:"email"`
	HashedPassword string `db:"hashed_password" json:"hashed_password"`
}
