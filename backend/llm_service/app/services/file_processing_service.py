from dataclasses import dataclass
from typing import ClassVar

from fastapi import UploadFile

from app.services.file_service import FileService
from app.utils import log


@dataclass
class ProcessedFile:
    filename: str
    extracted_text: str


class FileProcessingService:
    MAX_FILES: ClassVar[int] = 5
    MAX_TOTAL_TEXT_LENGTH: ClassVar[int] = 5 * (FileService.MAX_TEXT_LENGTH + len("\n\n[...text truncated...]"))

    @staticmethod
    async def process_file(file: UploadFile) -> ProcessedFile:
        is_valid, error_msg = FileService.validate_file(file)
        if not is_valid:
            raise ValueError(error_msg)

        text = await FileService.extract_text(file)

        log.info(f"File {file.filename} processed, extracted {len(text)} characters")

        return ProcessedFile(
            filename=str(file.filename),
            extracted_text=text,
        )

    @staticmethod
    async def process_files(files: list[UploadFile]) -> list[ProcessedFile]:
        if not files:
            return []

        if len(files) > FileProcessingService.MAX_FILES:
            raise ValueError(f"At most {FileProcessingService.MAX_FILES} files are allowed")
        log.info(f"Processing {len(files)} files")
        processed_files = []
        total_text_length = 0
        for file in files:
            try:
                processed = await FileProcessingService.process_file(file)
                total_text_length += len(processed.extracted_text)
                if total_text_length > FileProcessingService.MAX_TOTAL_TEXT_LENGTH:
                    raise ValueError("Combined extracted text exceeds the maximum length")
                processed_files.append(processed)
            except (ValueError, OSError, RuntimeError) as e:
                log.error(f"Error processing file {file.filename}: {e}")
                raise ValueError(f"Ошибка обработки файла {file.filename}: {e!s}") from e

        return processed_files

    @staticmethod
    def format_files_for_prompt(processed_files: list[ProcessedFile]) -> str:
        if not processed_files:
            return ""

        parts = [f"=== Содержимое файла: {pf.filename} ===\n{pf.extracted_text}" for pf in processed_files]

        return "\n\n".join(parts)
