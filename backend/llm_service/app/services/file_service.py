import io
import re
from pathlib import Path
from threading import Lock
from typing import BinaryIO, ClassVar
from zipfile import BadZipFile, ZipFile

import chardet
import fitz
from docx import Document
from fastapi import UploadFile
from starlette.concurrency import run_in_threadpool

from app.utils import log


class FileService:
    ALLOWED_EXTENSIONS: ClassVar[set[str]] = {".pdf", ".txt", ".md", ".docx"}
    MAX_FILE_SIZE: ClassVar[int] = 10 * 1024 * 1024
    MAX_TEXT_LENGTH: ClassVar[int] = 50000
    MIN_ENCODING_CONFIDENCE: ClassVar[float] = 0.7
    MAX_EXPANDED_DOCUMENT_SIZE: ClassVar[int] = 50 * 1024 * 1024
    _pdf_lock: ClassVar[Lock] = Lock()

    @classmethod
    def validate_file(cls, file: UploadFile) -> tuple[bool, str | None]:
        if not file.filename:
            return False, "File name is not specified"

        file_ext = Path(str(file.filename)).suffix.lower()
        if file_ext not in cls.ALLOWED_EXTENSIONS:
            return False, f"Invalid file format. Allowed: {', '.join(cls.ALLOWED_EXTENSIONS)}"

        if hasattr(file, "size") and file.size and file.size > cls.MAX_FILE_SIZE:
            return False, f"File is too large. Maximum: {cls.MAX_FILE_SIZE / (1024 * 1024):.1f}MB"

        return True, None

    @classmethod
    async def extract_text(cls, file: UploadFile) -> str:
        file_ext = Path(str(file.filename)).suffix.lower()
        log.info(f"Extracting text from file: {file.filename} (type: {file_ext})")

        try:
            return await cls._read_and_extract(file, file_ext)

        except (ValueError, OSError, RuntimeError) as e:
            log.error(f"Error extracting text from {file.filename}: {e}")
            raise ValueError(f"Failed to extract text from {file.filename}: {e!s}") from e
        finally:
            await file.seek(0)

    @classmethod
    async def _read_and_extract(cls, file: UploadFile, file_ext: str) -> str:
        content = await file.read(cls.MAX_FILE_SIZE + 1)
        if len(content) > cls.MAX_FILE_SIZE:
            raise ValueError("File exceeds the maximum size of 10MB")
        text = await run_in_threadpool(cls._extract_content, content, file_ext)

        if len(text) > cls.MAX_TEXT_LENGTH:
            log.warning(
                f"Text from {file.filename} is too long ({len(text)} characters), truncating to {cls.MAX_TEXT_LENGTH}"
            )
            text = text[: cls.MAX_TEXT_LENGTH] + "\n\n[...text truncated...]"

        log.info(f"Successfully extracted {len(text)} characters from {file.filename}")
        return text.strip()

    @classmethod
    def _extract_content(cls, content: bytes, file_ext: str) -> str:
        if file_ext == ".pdf":
            with cls._pdf_lock:
                return cls._extract_from_pdf(io.BytesIO(content))
        if file_ext == ".docx":
            return cls._extract_from_docx(io.BytesIO(content))
        if file_ext in {".txt", ".md"}:
            return cls._extract_from_text(content)
        raise ValueError(f"Unsupported file format: {file_ext}")

    @staticmethod
    def _fix_cyrillic_encoding(text: str) -> str:
        if not text:
            return text

        candidates = [text]

        try:
            fixed_cp1251 = text.encode("latin1").decode("cp1251")
            if fixed_cp1251 != text:
                candidates.append(fixed_cp1251)
        except (UnicodeEncodeError, UnicodeDecodeError):
            pass

        try:
            fixed_koi8 = text.encode("latin1").decode("koi8-r")
            if fixed_koi8 != text:
                candidates.append(fixed_koi8)
        except (UnicodeEncodeError, UnicodeDecodeError):
            pass

        best_candidate = text
        max_cyrillic = len(re.findall(r"[а-яА-ЯёЁ]", text))

        for cand in candidates[1:]:
            cyr_count = len(re.findall(r"[а-яА-ЯёЁ]", cand))
            if cyr_count > max_cyrillic:
                max_cyrillic = cyr_count
                best_candidate = cand

        return best_candidate

    @classmethod
    def _extract_from_pdf(cls, file_obj: BinaryIO) -> str:
        try:
            return cls._read_pdf(file_obj)
        except (RuntimeError, OSError) as error:
            raise ValueError(f"Error reading PDF: {error!s}") from error

    @classmethod
    def _read_pdf(cls, file_obj: BinaryIO) -> str:
        with fitz.open(stream=file_obj.read(), filetype="pdf") as document:
            if document.needs_pass:
                raise ValueError("PDF file is protected by a password")
            text_parts = []
            text_length = 0
            for page_number in range(len(document)):
                page_text = cls._read_pdf_page(document, page_number)
                if not page_text.strip():
                    continue
                part = f"--- ???????? {page_number + 1} ---\n{page_text}"
                text_parts.append(part[: cls.MAX_TEXT_LENGTH + 1])
                text_length += len(part) + (2 if len(text_parts) > 1 else 0)
                if text_length > cls.MAX_TEXT_LENGTH:
                    break
            if not text_parts:
                raise ValueError("Failed to extract text from any page of the PDF")
            return "\n\n".join(text_parts)

    @classmethod
    def _read_pdf_page(cls, document: fitz.Document, page_number: int) -> str:
        try:
            text = document[page_number].get_text(
                flags=fitz.TEXT_PRESERVE_WHITESPACE | fitz.TEXT_PRESERVE_LIGATURES | fitz.TEXT_DEHYPHENATE,
            )
        except (IndexError, RuntimeError, ValueError) as error:
            log.warning(f"Failed to extract text from page {page_number + 1}: {error}")
            return ""
        return cls._fix_cyrillic_encoding(text)

    @classmethod
    def _extract_from_docx(cls, file_obj: BinaryIO) -> str:
        try:
            return cls._read_docx(file_obj)
        except (ValueError, OSError, AttributeError, BadZipFile) as error:
            raise ValueError(f"Error reading DOCX: {error!s}") from error

    @classmethod
    def _read_docx(cls, file_obj: BinaryIO) -> str:
        with ZipFile(file_obj) as archive:
            if sum(entry.file_size for entry in archive.infolist()) > cls.MAX_EXPANDED_DOCUMENT_SIZE:
                raise ValueError("Expanded document exceeds the maximum size of 50MB")
        file_obj.seek(0)
        document = Document(file_obj)
        paragraphs = []
        text_length = 0
        for paragraph in document.paragraphs:
            text = paragraph.text
            if not text.strip():
                continue
            paragraphs.append(text[: cls.MAX_TEXT_LENGTH + 1])
            text_length += len(text) + (2 if len(paragraphs) > 1 else 0)
            if text_length > cls.MAX_TEXT_LENGTH:
                break
        if not paragraphs:
            raise ValueError("Document does not contain text")
        return "\n\n".join(paragraphs)

    @classmethod
    def _extract_from_text(cls, content: bytes) -> str:
        try:
            return cls._decode_text(content)
        except (UnicodeDecodeError, LookupError, OSError) as error:
            raise ValueError(f"Error reading text file: {error!s}") from error

    @classmethod
    def _decode_text(cls, content: bytes) -> str:
        try:
            return content.decode("utf-8")
        except UnicodeDecodeError:
            detected = chardet.detect(content)
        encoding = detected.get("encoding") or "utf-8"
        confidence = detected.get("confidence", 0)
        log.info(f"Detected encoding: {encoding} (confidence: {confidence:.2f})")
        if confidence < cls.MIN_ENCODING_CONFIDENCE:
            log.warning(f"Low confidence in encoding detection: {confidence:.2f}")
        return content.decode(str(encoding), errors="replace")
