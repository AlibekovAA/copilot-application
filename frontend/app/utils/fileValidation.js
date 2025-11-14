// Константы валидации файлов
export const ALLOWED_FILE_TYPES = ['.pdf', '.docx', '.txt', '.png', '.jpg', '.doc', '.jpeg'];
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_FILES = 5;
export const MAX_TOTAL_SIZE = 10 * 1024 * 1024; // 10MB суммарно

/**
 * Получает расширение файла
 */
function getFileExtension(filename) {
  const parts = filename.split('.');
  if (parts.length < 2) return '';
  return '.' + parts[parts.length - 1].toLowerCase();
}

/**
 * Форматирует размер файла в читаемый вид
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Валидирует один файл
 */
function validateSingleFile(file) {
  const ext = getFileExtension(file.name);
  
  if (!ALLOWED_FILE_TYPES.includes(ext)) {
    return {
      valid: false,
      error: `Файл "${file.name}" имеет недопустимый формат. Разрешены: ${ALLOWED_FILE_TYPES.join(', ')}`
    };
  }
  
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Файл "${file.name}" превышает максимальный размер ${formatFileSize(MAX_FILE_SIZE)}`
    };
  }
  
  return { valid: true };
}

/**
 * Валидирует массив файлов
 */
export function validateFiles(files) {
  if (!files || files.length === 0) {
    return { valid: true, files: [] };
  }
  
  // Проверка количества файлов
  if (files.length > MAX_FILES) {
    return {
      valid: false,
      error: `Можно загрузить максимум ${MAX_FILES} файлов. Выбрано: ${files.length}`
    };
  }
  
  // Проверка каждого файла
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const validation = validateSingleFile(file);
    if (!validation.valid) {
      return validation;
    }
  }
  
  // Проверка суммарного размера
  const totalSize = Array.from(files).reduce((sum, file) => sum + file.size, 0);
  if (totalSize > MAX_TOTAL_SIZE) {
    return {
      valid: false,
      error: `Суммарный размер файлов (${formatFileSize(totalSize)}) превышает максимальный размер ${formatFileSize(MAX_TOTAL_SIZE)}`
    };
  }
  
  return { valid: true, files: Array.from(files) };
}

/**
 * Валидирует новые файлы с учетом уже выбранных
 */
export function validateNewFiles(newFiles, existingFiles = []) {
  const allFiles = [...existingFiles, ...Array.from(newFiles)];
  return validateFiles(allFiles);
}

