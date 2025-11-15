'use client';
import { ScrollArea } from '../ui/scroll-area';
import { Card } from '../ui/card';
import { MessageSquare, Clock } from './icons';
import styles from './QuestionHistory.module.css';

export function QuestionHistory({ history, onSelectHistory }) {
  if (history.length === 0) {
    return (
      <div className={styles.emptyState}>
        <MessageSquare className={styles.emptyIcon} />
        <p className={styles.emptyText}>Пока нет вопросов</p>
        <p className={styles.emptySubtext}>
          Задайте первый вопрос, чтобы начать
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className={styles.scrollAreaFull}>
      <div className={styles.historyList}>
        {history.map((item) => (
          <Card
            key={item.id}
            className={styles.historyCard}
            onClick={() => onSelectHistory(item)}
          >
            <div className={styles.historyContent}>
              <div className={styles.historyHeader}>
                <MessageSquare className={styles.historyIcon} />
                <p className={styles.historyQuestion}>
                  {item.question}
                </p>
              </div>
              <div className={styles.historyFooter}>
                <Clock className={styles.historyClockIcon} />
                {formatTime(item.timestamp)}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}

function formatTime(date) {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Только что';
  if (diffMins < 60) return `${diffMins}м назад`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}ч назад`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}д назад`;
}

