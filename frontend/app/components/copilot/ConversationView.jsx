'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '../ui/card';
import { Copy, Check } from './icons';
import { cn } from '../ui/utils';
import styles from './ConversationView.module.css';

const USER_LABEL = 'Вы';
const ASSISTANT_LABEL = 'AI';
const TYPING_INTERVAL = 12;

export function ConversationView({ messages, typingState, onTypingComplete }) {
  const bottomRef = useRef(null);
  const [animatedText, setAnimatedText] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const copyTimeoutRef = useRef(null);
  const typingMessage = useMemo(
    () => (typingState.messageId ? messages.find(message => message.id === typingState.messageId) : null),
    [messages, typingState.messageId],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, animatedText, typingState.messageId]);

  useEffect(() => {
    if (!typingState.messageId || !typingState.fullText || !typingMessage) {
      setAnimatedText('');
      return;
    }

    setAnimatedText('');
    let index = 0;
    const interval = window.setInterval(() => {
      index += 1;
      setAnimatedText(typingState.fullText.slice(0, index));
      if (index >= typingState.fullText.length) {
        window.clearInterval(interval);
        onTypingComplete();
      }
    }, TYPING_INTERVAL);

    return () => {
      window.clearInterval(interval);
    };
  }, [typingMessage, typingState.fullText, typingState.messageId, onTypingComplete]);

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

    navigator.clipboard.writeText(content).then(() => {
      setCopiedMessageId(messageId);
      copyTimeoutRef.current = window.setTimeout(() => {
        setCopiedMessageId(current => (current === messageId ? null : current));
        copyTimeoutRef.current = null;
      }, 1800);
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
      <div ref={bottomRef} />
    </div>
  );
}

