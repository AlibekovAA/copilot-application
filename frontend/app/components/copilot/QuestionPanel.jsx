'use client';
import { useState, useRef } from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Send } from './icons';
import { TopicButtons } from './TopicButtons';
import styles from './QuestionPanel.module.css';

export function QuestionPanel({ onSubmit, isLoading }) {
  const [question, setQuestion] = useState('');
  const [currentTopic, setCurrentTopic] = useState(null);
  const isUpdatingTopicRef = useRef(false);

  const handleSubmit = () => {
    if (question.trim() && !isLoading) {
      onSubmit(question);
      setQuestion('');
      setCurrentTopic(null);
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
          disabled={!question.trim() || isLoading}
          className={`gap-2 shrink-0 ${styles.submitButton}`}
        >
          {isLoading ? 'Отправка...' : 'Отправить'}
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

