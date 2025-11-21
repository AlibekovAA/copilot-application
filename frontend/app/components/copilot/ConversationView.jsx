'use client';

import { useEffect, useRef, useState } from 'react';
import { Card } from '../ui/card';
import { Copy, Check, Paperclip } from './icons';
import { cn } from '../ui/utils';
import { TYPING_INTERVAL_MS } from '../../utils/apiHelpers';
import { formatFileSize } from '../../utils/fileValidation';
import { useToast } from '../ui/toast';
import styles from './ConversationView.module.css';

const USER_LABEL = 'Вы';
const ASSISTANT_LABEL = 'AI';

export function ConversationView({ messages, typingState, onTypingComplete, isLoadingAnswer }) {
  const bottomRef = useRef(null);
  const [animatedText, setAnimatedText] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const copyTimeoutRef = useRef(null);
  const typingIntervalRef = useRef(null);
  const currentTypingMessageIdRef = useRef(null);
  const currentIndexRef = useRef(0);
  const toast = useToast();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, animatedText, typingState.messageId]);

  useEffect(() => {
    if (!typingState.messageId || !typingState.fullText) {
      if (typingIntervalRef.current) {
        window.clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
      currentTypingMessageIdRef.current = null;
      currentIndexRef.current = 0;
      setAnimatedText('');
      return;
    }

    if (currentTypingMessageIdRef.current === typingState.messageId && typingIntervalRef.current) {
      return;
    }

    if (typingIntervalRef.current) {
      window.clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }

    const startIndex = currentTypingMessageIdRef.current === typingState.messageId
      ? currentIndexRef.current
      : 0;

    currentTypingMessageIdRef.current = typingState.messageId;
    currentIndexRef.current = startIndex;

    if (startIndex >= typingState.fullText.length) {
      setAnimatedText(typingState.fullText);
      onTypingComplete();
      return;
    }

    setAnimatedText(typingState.fullText.slice(0, startIndex));

    typingIntervalRef.current = window.setInterval(() => {
      currentIndexRef.current += 1;
      setAnimatedText(typingState.fullText.slice(0, currentIndexRef.current));
      if (currentIndexRef.current >= typingState.fullText.length) {
        window.clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
        onTypingComplete();
      }
    }, TYPING_INTERVAL_MS);

    return () => {
      if (typingIntervalRef.current) {
        window.clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
    };
  }, [typingState.messageId, typingState.fullText, onTypingComplete]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = null;
      }
    };
  }, []);

  const handleCopy = (messageId, content) => {
    if (copyTimeoutRef.current) {
      window.clearTimeout(copyTimeoutRef.current);
    }

    navigator.clipboard.writeText(content)
      .then(() => {
        setCopiedMessageId(messageId);
        copyTimeoutRef.current = window.setTimeout(() => {
          setCopiedMessageId(current => (current === messageId ? null : current));
          copyTimeoutRef.current = null;
        }, 1800);
      })
      .catch((error) => {
        console.error('Failed to copy to clipboard:', error);
        toast.error('Не удалось скопировать текст');
      });
  };

  const getMessageContent = (message) => {
    if (message.id === typingState.messageId && animatedText) {
      return animatedText;
    }
    return message.content;
  };

  const isTypingMessage = (message) =>
    message.id === typingState.messageId && animatedText.length < typingState.fullText.length;

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) return 'только что';
    if (diffMinutes < 60) return `${diffMinutes} мин назад`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} ч назад`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} д назад`;

    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMessageLabel = (role) => (role === 'user' ? USER_LABEL : ASSISTANT_LABEL);

  const showThinkingIndicator = isLoadingAnswer && messages.length > 0 &&
    messages[messages.length - 1]?.role === 'user' &&
    !messages.some(m => m.role === 'assistant' && m.id === typingState.messageId);

  return (
    <div className={styles.conversationList}>
      {messages.map(message => {
        const content = getMessageContent(message);
        const label = getMessageLabel(message.role);
        const isAssistant = message.role === 'assistant';
        const showTypingIndicator = isTypingMessage(message);

        return (
          <Card
            key={message.id}
            className={cn(
              styles.card,
              isAssistant ? styles.cardAssistant : styles.cardUser,
              isAssistant ? styles.cardLeft : styles.cardRight
            )}
          >
            <div className={styles.messageContent}>
              {isAssistant && (
                <div className={styles.labelRow}>
                  <p className={styles.label}>Ответ</p>
                </div>
              )}

              {message.files && message.files.length > 0 && (
                <div className={styles.filesSection}>
                  {message.files.map((file, index) => (
                    <div key={index} className={styles.fileItem}>
                      <Paperclip className={styles.fileIcon} />
                      <span className={styles.fileName}>{file.name}</span>
                      <span className={styles.fileSize}>{formatFileSize(file.size)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className={styles.messageTextWrapper}>
                <p className={styles.messageText}>
                  {content}
                  {showTypingIndicator && <span className={styles.typingCaret} />}
                </p>
                {!showTypingIndicator && content && (
                  <button
                    type="button"
                    onClick={() => handleCopy(message.id, message.content)}
                    className={cn(
                      styles.copyButton,
                      copiedMessageId === message.id && styles.copyButtonCopied,
                    )}
                    aria-label={copiedMessageId === message.id ? 'Скопировано' : isAssistant ? 'Копировать ответ' : 'Копировать сообщение'}
                  >
                    {copiedMessageId === message.id ? <Check className={styles.copyIcon} /> : <Copy className={styles.copyIcon} />}
                  </button>
                )}
              </div>
            </div>
          </Card>
        );
      })}
      {showThinkingIndicator && (
        <Card className={cn(styles.card, styles.cardAssistant, styles.cardLeft, styles.thinkingCard)}>
          <div className={styles.messageContent}>
            <div className={styles.labelRow}>
              <p className={styles.label}>Ответ</p>
            </div>
            <div className={styles.messageTextWrapper}>
              <div className={styles.thinkingIndicator}>
                <span className={styles.thinkingDot}></span>
                <span className={styles.thinkingDot}></span>
                <span className={styles.thinkingDot}></span>
                <span className={styles.thinkingText}>Думаю...</span>
              </div>
            </div>
          </div>
        </Card>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
