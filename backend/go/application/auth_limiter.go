package application

import (
	"net/http"
)

type authLimiter struct {
	slots chan struct{}
	queue chan struct{}
}

func newAuthLimiter(maxConcurrent, maxQueued int) *authLimiter {
	return &authLimiter{
		slots: make(chan struct{}, maxConcurrent),
		queue: make(chan struct{}, maxQueued),
	}
}

func (limiter *authLimiter) acquire(r *http.Request) bool {
	select {
	case limiter.queue <- struct{}{}:
	default:
		return false
	}

	defer func() { <-limiter.queue }()
	select {
	case limiter.slots <- struct{}{}:
		return true
	case <-r.Context().Done():
		return false
	}
}

func (limiter *authLimiter) release() {
	<-limiter.slots
}

func (app *Application) limitAuthRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !app.authLimiter.acquire(r) {
			if r.Context().Err() != nil {
				return
			}
			app.logger.Debugf("Authentication request limited: path=%s, IP=%s", r.URL.Path, getClientIP(r))
			w.Header().Set("Retry-After", "1")
			app.respondWithError(w, http.StatusTooManyRequests, "too many authentication requests")
			return
		}
		defer app.authLimiter.release()
		next.ServeHTTP(w, r)
	})
}
