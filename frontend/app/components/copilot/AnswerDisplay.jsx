'use client';
import { useEffect, useState } from 'react';
import { Card } from '../ui/card';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Button } from '../ui/button';
import { Copy, Check } from './icons';
import styles from './AnswerDisplay.module.css';

export function AnswerDisplay({ 
  question, 
  answer, 
  isTyping 
}) {
  const [displayedAnswer, setDisplayedAnswer] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isTyping && answer) {
      let index = 0;
      setDisplayedAnswer('');
      const interval = setInterval(() => {
        if (index < answer.length) {
          setDisplayedAnswer(answer.slice(0, index + 1));
          index++;
        } else {
          clearInterval(interval);
        }
      }, 10);
      return () => clearInterval(interval);
    } else {
      setDisplayedAnswer(answer);
    }
  }, [answer, isTyping]);

  const handleCopy = () => {
    navigator.clipboard.writeText(answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!question) return null;

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <div className={styles.cardContent}>
          <Avatar className={styles.avatar}>
            <AvatarFallback className={styles.avatarFallback}>Вы</AvatarFallback>
          </Avatar>
          <div className={styles.content}>
            <p className={styles.label}>Ваш вопрос</p>
            <p className={styles.questionText}>{question}</p>
          </div>
        </div>
      </Card>

      <Card className={styles.card}>
        <div className={styles.cardContent}>
          <Avatar className={styles.avatar}>
            <AvatarFallback className={styles.avatarFallbackAI}>
              AI
            </AvatarFallback>
          </Avatar>
          <div className={styles.contentAI}>
            <p className={styles.label}>Ответ</p>
            <div>
              <p className={styles.answerText}>{displayedAnswer}</p>
              {isTyping && <span className={styles.typingIndicator} />}
            </div>
            {!isTyping && answer && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className={styles.copyButton}
              >
                {copied ? (
                  <>
                    <Check className={styles.copyIcon} />
                    Скопировано!
                  </>
                ) : (
                  <>
                    <Copy className={styles.copyIcon} />
                    Копировать ответ
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

