import asyncio
from dataclasses import dataclass

from fastapi import UploadFile

from app.services.file_service import FileService
from app.utils import log


@dataclass
class ProcessedFile:
    filename: str
    extracted_text: str


class FileProcessingService:
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

        log.info(f"Processing {len(files)} files")

        async def process_single_file(file: UploadFile) -> ProcessedFile:
            try:
                return await FileProcessingService.process_file(file)
            except (ValueError, OSError, RuntimeError) as e:
                log.error(f"Error processing file {file.filename}: {e}")
                raise ValueError(f"Ошибка обработки файла {file.filename}: {e!s}") from e

        processed_files = await asyncio.gather(*[process_single_file(file) for file in files])
        return list(processed_files)

    @staticmethod
    def format_files_for_prompt(processed_files: list[ProcessedFile]) -> str:
        if not processed_files:
            return ""

        parts = [f"=== Содержимое файла: {pf.filename} ===\n{pf.extracted_text}" for pf in processed_files]

        return "\n\n".join(parts)
