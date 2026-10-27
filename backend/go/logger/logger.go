package logger

import (
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"gopkg.in/natefinch/lumberjack.v2"
)

type LogLevel int

const (
	DEBUG LogLevel = iota
	INFO
	WARNING
	ERROR
	CRITICAL
)

var levelNames = map[LogLevel]string{
	DEBUG:    "DEBUG",
	INFO:     "INFO",
	WARNING:  "WARNING",
	ERROR:    "ERROR",
	CRITICAL: "CRITICAL",
}

type Logger struct {
	level LogLevel
	out   *log.Logger
	mu    sync.RWMutex
}

var (
	instance *Logger
	once     sync.Once
)

func GetInstance() *Logger {
	once.Do(func() {
		instance = &Logger{
			level: CRITICAL,
			out:   log.New(os.Stderr, "", log.LstdFlags|log.Lshortfile),
		}
	})
	return instance
}

func (l *Logger) Initialize(logDir string, level LogLevel) error {
	l.mu.Lock()
	defer l.mu.Unlock()

	l.level = level

	if err := os.MkdirAll(logDir, 0o755); err != nil {
		return fmt.Errorf("failed to create log directory: %w", err)
	}

	logFile := filepath.Join(logDir, "app.log")

	fileWriter := &lumberjack.Logger{
		Filename:   logFile,
		MaxSize:    100,
		MaxBackups: 3,
		MaxAge:     28,
		Compress:   true,
	}

	multiWriter := io.MultiWriter(os.Stdout, fileWriter)
	l.out = log.New(multiWriter, "", log.LstdFlags|log.Lshortfile)

	return nil
}

func (l *Logger) log(level LogLevel, format string, args ...any) {
	l.mu.RLock()
	defer l.mu.RUnlock()

	if level < l.level {
		return
	}

	l.out.Output(3, fmt.Sprintf("[%s] %s", levelNames[level], fmt.Sprintf(format, args...)))
}

func (l *Logger) Info(msg string)  { l.log(INFO, "%s", msg) }
func (l *Logger) Error(msg string) { l.log(ERROR, "%s", msg) }

func (l *Logger) Debugf(format string, args ...any) {
	l.log(DEBUG, format, args...)
}

func (l *Logger) Infof(format string, args ...any) {
	l.log(INFO, format, args...)
}

func (l *Logger) Warnf(format string, args ...any) {
	l.log(WARNING, format, args...)
}

func (l *Logger) Errorf(format string, args ...any) {
	l.log(ERROR, format, args...)
}

func (l *Logger) Fatalf(format string, args ...any) {
	l.log(CRITICAL, format, args...)
	os.Exit(1)
}

func (l *Logger) Write(message []byte) (int, error) {
	l.Error(strings.TrimSpace(string(message)))
	return len(message), nil
}
