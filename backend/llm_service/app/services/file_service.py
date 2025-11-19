import io
import re
from pathlib import Path
from typing import BinaryIO, ClassVar

import chardet
import fitz
from docx import Document
from fastapi import UploadFile

from app.utils import log


class FileService:
    ALLOWED_EXTENSIONS: ClassVar[set[str]] = {".pdf", ".txt", ".md", ".docx", ".doc"}
    MAX_FILE_SIZE: ClassVar[int] = 10 * 1024 * 1024
    MAX_TEXT_LENGTH: ClassVar[int] = 50000
    MIN_ENCODING_CONFIDENCE: ClassVar[float] = 0.7

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
            content = await file.read()

            if file_ext == ".pdf":
                text = cls._extract_from_pdf(io.BytesIO(content))
            elif file_ext in {".docx", ".doc"}:
                text = cls._extract_from_docx(io.BytesIO(content))
            elif file_ext in {".txt", ".md"}:
                text = cls._extract_from_text(content)
            else:
                raise ValueError(f"Unsupported file format: {file_ext}")

            if len(text) > cls.MAX_TEXT_LENGTH:
                log.warning(
                    f"Text from {file.filename} is too long ({len(text)} characters), "
                    f"truncating to {cls.MAX_TEXT_LENGTH}"
                )
                text = text[: cls.MAX_TEXT_LENGTH] + "\n\n[...text truncated...]"

            log.info(f"Successfully extracted {len(text)} characters from {file.filename}")
            return text.strip()

        except (ValueError, OSError, RuntimeError) as e:
            log.error(f"Error extracting text from {file.filename}: {e}")
            raise ValueError(f"Failed to extract text from {file.filename}: {e!s}") from e
        finally:
            await file.seek(0)

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
        doc = None
        try:
            doc = fitz.open(stream=file_obj.read(), filetype="pdf")

            if doc.needs_pass:
                raise ValueError("PDF file is protected by a password")

            text_parts = []
            total_pages = len(doc)

            for page_num in range(total_pages):
                try:
                    page = doc[page_num]
                    page_text = page.get_text(
                        "text",
                        flags=(fitz.TEXT_PRESERVE_WHITESPACE | fitz.TEXT_PRESERVE_LIGATURES | fitz.TEXT_DEHYPHENATE),
                    )

                    if page_text.strip():
                        fixed_text = cls._fix_cyrillic_encoding(page_text)
                        text_parts.append(f"--- Страница {page_num + 1} ---\n{fixed_text}")

                except (IndexError, RuntimeError, ValueError) as e:
                    log.warning(f"Failed to extract text from page {page_num + 1}: {e}")
                    continue

            if not text_parts:
                raise ValueError("Failed to extract text from any page of the PDF")

            return "\n\n".join(text_parts)

        except ValueError:
            raise
        except (RuntimeError, OSError) as e:
            raise ValueError(f"Error reading PDF: {e!s}") from e
        finally:
            if doc is not None:
                doc.close()

    @staticmethod
    def _extract_from_docx(file_obj: BinaryIO) -> str:
        try:
            doc = Document(file_obj)
            paragraphs = [para.text for para in doc.paragraphs if para.text.strip()]

            if not paragraphs:
                raise ValueError("Document does not contain text")

            return "\n\n".join(paragraphs)

        except (ValueError, OSError, AttributeError) as e:
            raise ValueError(f"Error reading DOCX: {e!s}") from e

    @classmethod
    def _extract_from_text(cls, content: bytes) -> str:
        try:
            try:
                return content.decode("utf-8")
            except UnicodeDecodeError:
                pass

            detected = chardet.detect(content)
            encoding = detected.get("encoding") or "utf-8"
            confidence = detected.get("confidence", 0)

            log.info(f"Detected encoding: {encoding} (confidence: {confidence:.2f})")

            if confidence < cls.MIN_ENCODING_CONFIDENCE:
                log.warning(f"Low confidence in encoding detection: {confidence:.2f}")

            return content.decode(str(encoding), errors="replace")

        except (UnicodeDecodeError, LookupError, OSError) as e:
            raise ValueError(f"Error reading text file: {e!s}") from e
