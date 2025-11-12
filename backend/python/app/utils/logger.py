import contextlib
import inspect
import json
import logging
import os
import sys
import threading
from collections.abc import Callable
from datetime import UTC, datetime
from logging.handlers import RotatingFileHandler
from pathlib import Path
from queue import Empty, Full, Queue
from threading import Thread
from types import FrameType
from typing import Any, ClassVar, Optional, Self, TextIO, TypedDict, Unpack


class LogKwargs(TypedDict, total=False):
    exc_info: bool
    stack_info: bool
    extra: dict[str, object]


class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.now(UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        if hasattr(record, "__dict__") and "extra" in record.__dict__:
            extra: Any = getattr(record, "extra", None)
            if extra and isinstance(extra, dict):
                log_data.update(extra)

        return json.dumps(log_data, ensure_ascii=False)


class Logger:
    _instance: ClassVar[Optional["Logger"]] = None
    _lock: ClassVar[threading.Lock] = threading.Lock()

    def __new__(cls) -> Self:
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._init()
        return cls._instance  # type: ignore[return-value]

    @staticmethod
    def _get_caller() -> str:
        frame: FrameType | None = inspect.currentframe()
        fname: str | None
        result: str
        try:
            while frame:
                fname = frame.f_globals.get("__file__")
                if fname and Path(fname).stem != Path(__file__).stem:
                    result = Path(fname).stem
                    return result
                frame = frame.f_back
            result = "unknown"
            return result
        finally:
            del frame

    def _init(self) -> None:
        self.log_dir: Path = Path(os.getenv("LOG_DIR", "./logs"))
        self.log_dir.mkdir(parents=True, exist_ok=True)

        log_format = os.getenv("LOG_FORMAT", "json")
        if log_format == "json":
            self.formatter: logging.Formatter = JSONFormatter()
        else:
            self.formatter = logging.Formatter(
                fmt="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                datefmt="%Y-%m-%d %H:%M:%S",
            )

        self.queue: Queue[tuple[str, str, str, tuple[object, ...], dict[str, object]]] = Queue(
            maxsize=1000
        )
        self.loggers: dict[str, logging.Logger] = {}
        self._stop_event = threading.Event()

        self.thread: Thread = Thread(target=self._worker, daemon=False)
        self.thread.start()

    def _get_logger(self, name: str) -> logging.Logger:
        if name in self.loggers:
            return self.loggers[name]

        logger: logging.Logger = logging.getLogger(name)
        log_level_str: str = os.getenv("LOG_LEVEL", "INFO").upper()
        log_level: int = getattr(logging, log_level_str, logging.INFO)
        logger.setLevel(log_level)
        logger.propagate = False

        console_handler: logging.StreamHandler[TextIO] = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(self.formatter)
        logger.addHandler(console_handler)

        file_path: Path = self.log_dir / f"{name}.log"
        file_handler: RotatingFileHandler = RotatingFileHandler(
            file_path,
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=5,
            encoding="utf-8",
        )
        file_handler.setFormatter(self.formatter)
        logger.addHandler(file_handler)

        self.loggers[name] = logger
        return logger

    def _worker(self) -> None:
        while not self._stop_event.is_set():
            try:
                item: tuple[str, str, str, tuple[object, ...], dict[str, object]] = self.queue.get(
                    timeout=0.1
                )
                level, name, msg, args, kwargs = item

                try:
                    logger: logging.Logger = self._get_logger(name)
                    log_method: Callable[..., object] | None = getattr(logger, level.lower(), None)
                    if callable(log_method):
                        log_method(msg, *args, **kwargs)
                except AttributeError as e:
                    err_msg: str = f"Logging error: {e}"
                    print(err_msg, file=sys.stderr)  # noqa: T201
                finally:
                    self.queue.task_done()
            except Empty:
                continue

        while not self.queue.empty():
            try:
                item = self.queue.get_nowait()
                level, name, msg, args, kwargs = item
                logger = self._get_logger(name)
                log_method = getattr(logger, level.lower(), None)
                if callable(log_method):
                    log_method(msg, *args, **kwargs)
                self.queue.task_done()
            except Empty:
                break
            except (AttributeError, ValueError, TypeError) as e:
                print(f"Error during shutdown logging: {e}", file=sys.stderr)  # noqa: T201

    def _log(
        self,
        level: str,
        msg: str,
        *args: tuple[object, ...],
        **kwargs: Unpack[LogKwargs],
    ) -> None:
        name: str = self._get_caller()
        log_item: tuple[str, str, str, tuple[object, ...], dict[str, object]] = (
            level,
            name,
            msg,
            args,
            dict(kwargs),
        )

        try:
            self.queue.put_nowait(log_item)
        except Full:
            print(f"[QUEUE FULL] {level}: {msg}", file=sys.stderr)  # noqa: T201
            if level in {"ERROR", "CRITICAL"}:
                with contextlib.suppress(Full):
                    self.queue.put(log_item, timeout=1)

    def shutdown(self) -> None:
        self._stop_event.set()
        self.queue.join()
        self.thread.join(timeout=5)

        for logger in self.loggers.values():
            for handler in logger.handlers[:]:
                handler.close()
                logger.removeHandler(handler)

    def debug(self, msg: str, *args: tuple[object, ...], **kwargs: Unpack[LogKwargs]) -> None:
        self._log("DEBUG", msg, *args, **kwargs)

    def info(self, msg: str, *args: tuple[object, ...], **kwargs: Unpack[LogKwargs]) -> None:
        self._log("INFO", msg, *args, **kwargs)

    def warning(self, msg: str, *args: tuple[object, ...], **kwargs: Unpack[LogKwargs]) -> None:
        self._log("WARNING", msg, *args, **kwargs)

    def error(self, msg: str, *args: tuple[object, ...], **kwargs: Unpack[LogKwargs]) -> None:
        self._log("ERROR", msg, *args, **kwargs)

    def critical(self, msg: str, *args: tuple[object, ...], **kwargs: Unpack[LogKwargs]) -> None:
        self._log("CRITICAL", msg, *args, **kwargs)


logger: Logger = Logger()
debug: Callable[[str], None] = logger.debug
info: Callable[[str], None] = logger.info
warning: Callable[[str], None] = logger.warning
error: Callable[[str], None] = logger.error
critical: Callable[[str], None] = logger.critical
