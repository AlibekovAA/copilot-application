'use client';
import { useState, useRef } from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Send, Paperclip, X } from './icons';
import { TopicButtons } from './TopicButtons';
import { validateNewFiles, formatFileSize, MAX_FILES } from '../../utils/fileValidation';
import styles from './QuestionPanel.module.css';

export function QuestionPanel({ onSubmit, isLoading }) {
  const [question, setQuestion] = useState('');
  const [currentTopic, setCurrentTopic] = useState(null);
  const [files, setFiles] = useState([]);
  const [validationError, setValidationError] = useState(null);
  const fileInputRef = useRef(null);
  const isUpdatingTopicRef = useRef(false);

  const handleSubmit = () => {
    if ((question.trim() || files.length > 0) && !isLoading) {
      onSubmit(question, files);
      setQuestion('');
      setCurrentTopic(null);
      setFiles([]);
      setValidationError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSelectTopic = (topic) => {
    isUpdatingTopicRef.current = true;
    
    if (topic) {
      // Добавляем или заменяем хэштег в начале вопроса
      const questionWithoutHashtag = question.replace(/^#[^\s]+\s*/, '');
      setQuestion(`#${topic} ${questionWithoutHashtag}`);
      setCurrentTopic(topic);
    } else {
      // Убираем хэштег
      const questionWithoutHashtag = question.replace(/^#[^\s]+\s*/, '');
      setQuestion(questionWithoutHashtag);
      setCurrentTopic(null);
    }
    
    setTimeout(() => {
      isUpdatingTopicRef.current = false;
    }, 0);
  };

  const handleQuestionChange = (e) => {
    const newValue = e.target.value;
    setQuestion(newValue);
    
    // Если пользователь вручную изменил хэштег, обновляем тему
    if (!isUpdatingTopicRef.current) {
      const hashtagMatch = newValue.match(/^#([^\s]+)/);
      if (hashtagMatch) {
        const topicFromHashtag = hashtagMatch[1];
        // Проверяем, есть ли такая тема в списке
        const topics = ['юриспруденция', 'маркетинг', 'финансы', 'управление', 'продажи', 'HR'];
        if (topics.includes(topicFromHashtag)) {
          setCurrentTopic(topicFromHashtag);
        } else {
          setCurrentTopic(null);
        }
      } else {
        setCurrentTopic(null);
      }
    }
  };

  const handleFileSelect = (e) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) {
      return;
    }

    const validation = validateNewFiles(selectedFiles, files);
    
    if (!validation.valid) {
      setValidationError(validation.error);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setValidationError(null);
    setFiles([...files, ...Array.from(selectedFiles)]);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (indexToRemove) => {
    setFiles(files.filter((_, index) => index !== indexToRemove));
    setValidationError(null);
  };

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <Textarea
        value={question}
        onChange={handleQuestionChange}
        onKeyDown={handleKeyDown}
        placeholder="Задайте ваш вопрос здесь... (Ctrl + Enter для отправки)"
        className="min-h-[120px] resize-none"
        disabled={isLoading}
      />
      
      {/* Загрузка файлов */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.txt,.png,.jpg,.doc,.jpeg"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isLoading}
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleFileButtonClick}
            disabled={isLoading || files.length >= MAX_FILES}
            className={`gap-2 ${styles.fileButton}`}
          >
            <Paperclip className="h-4 w-4" />
            Прикрепить файл
          </Button>
          {files.length > 0 && (
            <span className="text-sm text-gray-400">
              {files.length} / {MAX_FILES} файлов
            </span>
          )}
        </div>

        {/* Ошибка валидации */}
        {validationError && (
          <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-md p-2">
            {validationError}
          </div>
        )}

        {/* Список выбранных файлов */}
        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between gap-2 p-2 bg-gray-800/50 border border-gray-700 rounded-md text-sm"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Paperclip className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="text-gray-300 truncate" title={file.name}>
                    {file.name}
                  </span>
                  <span className="text-gray-500 text-xs shrink-0">
                    {formatFileSize(file.size)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(index)}
                  disabled={isLoading}
                  className="text-gray-400 hover:text-red-400 transition-colors shrink-0 p-1"
                  aria-label={`Удалить ${file.name}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <TopicButtons 
            onSelectTopic={handleSelectTopic}
            isLoading={isLoading}
            activeTopic={currentTopic}
          />
        </div>
        <Button
          onClick={handleSubmit}
          disabled={(!question.trim() && files.length === 0) || isLoading}
          className={`gap-2 shrink-0 ${styles.submitButton}`}
        >
          {isLoading ? 'Отправка...' : 'Отправить'}
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

