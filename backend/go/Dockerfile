FROM golang:1.24-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download && go mod verify

COPY . .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-w -s" -o go-backend .

FROM alpine:latest
WORKDIR /app

COPY --from=builder /app/go-backend .

CMD ["./go-backend"]
