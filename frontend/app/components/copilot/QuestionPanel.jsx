'use client';
import { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Send, Paperclip, X } from './icons';
import { TopicButtons } from './TopicButtons';
import { validateNewFiles, formatFileSize, MAX_FILES } from '../../utils/fileValidation';
import styles from './QuestionPanel.module.css';

export function QuestionPanel({ onSubmit, isLoading }) {
  const [question, setQuestion] = useState('');
  const [activeTopics, setActiveTopics] = useState([]);
  const [files, setFiles] = useState([]);
  const [validationError, setValidationError] = useState(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const isUpdatingTopicRef = useRef(false);
  
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const maxHeight = window.innerHeight * 0.5;
      textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    }
  }, [question]);

  const handleSubmit = () => {
    if ((question.trim() || files.length > 0) && !isLoading) {
      onSubmit(question, files);
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

  const handleSelectTopic = (topics) => {
    isUpdatingTopicRef.current = true;
    setActiveTopics(topics);
    
    const questionWithoutHashtags = question
      .replace(/^(#[^\s]+(?:\s+#[^\s]+)*)\s*/g, '')
      .replace(/\s+(#[^\s]+(?:\s+#[^\s]+)*)$/g, '')
      .trim();
    
    if (topics.length > 0) {
      const hashtags = topics.map(t => `#${t}`).join(' ');
      setQuestion(questionWithoutHashtags ? `${questionWithoutHashtags} ${hashtags}` : hashtags);
    } else {
      setQuestion(questionWithoutHashtags);
    }
    
    setTimeout(() => {
      isUpdatingTopicRef.current = false;
    }, 0);
  };

  const handleQuestionChange = (e) => {
    const newValue = e.target.value;
    setQuestion(newValue);
    
    const textarea = e.target;
    textarea.style.height = 'auto';
    const maxHeight = window.innerHeight * 0.5;
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    
    if (!isUpdatingTopicRef.current) {
      const hashtagPattern = /\s+(#[^\s]+(?:\s+#[^\s]+)*)$/;
      const match = newValue.match(hashtagPattern);
      if (match) {
        const hashtags = match[1].split(/\s+/);
        const topicsFromHashtags = hashtags.map(h => h.replace('#', ''));
        const validTopics = ['юриспруденция', 'маркетинг', 'финансы', 'управление', 'продажи', 'HR'];
        const foundTopics = topicsFromHashtags.filter(t => validTopics.includes(t));
        setActiveTopics([...new Set(foundTopics)]);
      } else {
        const startHashtagPattern = /^(#[^\s]+(?:\s+#[^\s]+)*)\s*/;
        const startMatch = newValue.match(startHashtagPattern);
        if (startMatch) {
          const hashtags = startMatch[1].split(/\s+/);
          const topicsFromHashtags = hashtags.map(h => h.replace('#', ''));
          const validTopics = ['юриспруденция', 'маркетинг', 'финансы', 'управление', 'продажи', 'HR'];
          const foundTopics = topicsFromHashtags.filter(t => validTopics.includes(t));
          setActiveTopics([...new Set(foundTopics)]);
        } else {
          setActiveTopics([]);
        }
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
    <div className={styles.container}>
      <div className={styles.textareaWrapper}>
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
          accept=".pdf,.docx,.txt,.png,.jpg,.doc,.jpeg"
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
        
        <div className={styles.buttonsInside}>
          <div className={styles.footerLeft}>
            <TopicButtons 
              onSelectTopic={handleSelectTopic}
              isLoading={isLoading}
              activeTopics={activeTopics}
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={(!question.trim() && files.length === 0) || isLoading}
            className={styles.submitButton}
          >
            {isLoading ? 'Отправка...' : 'Отправить'}
            <Send className={styles.fileIcon} />
          </Button>
        </div>
      </div>
      
      <div className={styles.filesSection}>

        {validationError && (
          <div className={styles.validationError}>
            {validationError}
          </div>
        )}

        {files.length > 0 && (
          <div className={styles.filesList}>
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className={styles.fileItem}
              >
                <div className={styles.fileItemContent}>
                  <Paperclip className={styles.fileIcon} />
                  <span className={styles.fileName} title={file.name}>
                    {file.name}
                  </span>
                  <span className={styles.fileSize}>
                    {formatFileSize(file.size)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(index)}
                  disabled={isLoading}
                  className={styles.removeFileButton}
                  aria-label={`Удалить ${file.name}`}
                >
                  <X className={styles.removeFileIcon} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

