'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Send, Paperclip, X, File, FileText } from './icons';
import { TopicButtons } from './TopicButtons';
import { validateNewFiles, formatFileSize, MAX_FILES, ALLOWED_FILE_TYPES } from '../../utils/fileValidation';
import { removeHashtagsFromText } from '../../constants/topics';
import styles from './QuestionPanel.module.css';

export function QuestionPanel({ onSubmit, isLoading }) {
  const [question, setQuestion] = useState('');
  const [activeTopics, setActiveTopics] = useState([]);
  const [files, setFiles] = useState([]);
  const [validationError, setValidationError] = useState(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const isUpdatingTopicRef = useRef(false);

  const updateTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const maxHeight = window.innerHeight * 0.5;
      textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    }
  }, []);

  useEffect(() => {
    updateTextareaHeight();
  }, [question, updateTextareaHeight]);

  const handleSubmit = () => {
    if ((question.trim() || files.length > 0) && !isLoading) {
      const selectedTopic = activeTopics.length > 0 ? activeTopics[0] : null;
      onSubmit(question, files, selectedTopic);
      setQuestion('');
      setActiveTopics([]);
      setFiles([]);
      setValidationError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSelectTopic = useCallback((topics) => {
    isUpdatingTopicRef.current = true;
    setActiveTopics(topics);

    const questionWithoutHashtags = removeHashtagsFromText(question);
      setQuestion(questionWithoutHashtags);

    setTimeout(() => {
      isUpdatingTopicRef.current = false;
    }, 0);
  }, [question]);

  const handleQuestionChange = useCallback((e) => {
    const newValue = e.target.value;

    updateTextareaHeight();

    if (!isUpdatingTopicRef.current) {
      const questionWithoutHashtags = removeHashtagsFromText(newValue);
      setQuestion(questionWithoutHashtags);
    } else {
      setQuestion(newValue);
    }
  }, [updateTextareaHeight]);

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

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
      case 'doc':
      case 'docx':
        return File;
      case 'txt':
      case 'md':
        return FileText;
      default:
        return File;
    }
  };

  const getFileTypeColor = (fileName) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return '#ef3124';
      case 'doc':
      case 'docx':
        return '#2b579a';
      case 'txt':
        return '#6b7280';
      case 'md':
        return '#9933ff';
      default:
        return '#9ca3af';
    }
  };

  const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.textareaWrapper}>
        {validationError && (
          <div className={styles.validationError}>
            {validationError}
          </div>
        )}

        {files.length > 0 && (
          <div className={styles.filesListInline}>
            {files.map((file, index) => {
              const FileIcon = getFileIcon(file.name);
              const fileColor = getFileTypeColor(file.name);
              return (
                <div
                  key={`${file.name}-${index}`}
                  className={styles.fileChip}
                  style={{ '--file-color': fileColor }}
                >
                  <FileIcon 
                    className={styles.fileChipIcon} 
                    style={{ color: fileColor }}
                  />
                  <span className={styles.fileChipName} title={file.name}>
                    {file.name}
                  </span>
                  <span className={styles.fileChipSize}>
                    {formatFileSize(file.size)}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile(index);
                    }}
                    disabled={isLoading}
                    className={styles.removeFileChipButton}
                    aria-label={`Удалить ${file.name}`}
                  >
                    <X className={styles.removeFileChipIcon} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className={styles.textareaContainer}>
          <Textarea
            ref={textareaRef}
            value={question}
            onChange={handleQuestionChange}
            onKeyDown={handleKeyDown}
            placeholder="Задайте ваш вопрос здесь... (Enter для отправки, Shift+Enter для новой строки)"
            className={styles.textarea}
            disabled={isLoading}
          />
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ALLOWED_FILE_TYPES.join(',')}
            onChange={handleFileSelect}
            className={styles.hidden}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={handleFileButtonClick}
            disabled={isLoading || files.length >= MAX_FILES}
            className={styles.attachButton}
            aria-label="Прикрепить файл"
          >
            <Paperclip className={styles.attachIcon} />
          </button>
          <Button
            onClick={handleSubmit}
            disabled={(!question.trim() && files.length === 0) || isLoading}
            className={styles.submitButtonInline}
          >
            {isLoading ? 'Отправка...' : 'Отправить'}
            <Send className={styles.fileIcon} />
          </Button>
        </div>

        <div className={styles.buttonsInside}>
          <div className={styles.footerLeft}>
            <TopicButtons
              onSelectTopic={handleSelectTopic}
              isLoading={isLoading}
              activeTopics={activeTopics}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
