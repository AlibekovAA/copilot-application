import { ScrollArea } from '../ui/scroll-area';
import { MessageSquare, Trash } from './icons';
import styles from './SessionList.module.css';

export function SessionList({ sessions, activeSessionId, onSelectSession, onDeleteSession }) {
  if (!sessions.length) {
    return (
      <div className={styles.emptyState}>
        <div>
          <div className={styles.emptyIcon}>
            <MessageSquare className="h-10 w-10" />
          </div>
          <p>Начните новый диалог, чтобы увидеть историю здесь.</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className={`${styles.sessionListWrapper} p-4`}>
        {sessions.map(session => {
          const isActive = session.id === activeSessionId;
          return (
            <div
              key={session.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectSession(session.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelectSession(session.id);
                }
              }}
              className={`${styles.sessionButton} ${isActive ? styles.sessionButtonActive : ''}`}
            >
              <div className={styles.sessionContent}>
                <p className={styles.sessionTitle}>
                  {session.title.trim() || 'Новый диалог'}
                </p>
                <p className={styles.sessionPreview}>
                  {session.lastMessagePreview || 'Нет сообщений'}
                </p>
              </div>
              <div className={styles.sessionFooter}>
                <span>{formatRelativeTime(session.updatedAt)}</span>
                <div className={styles.sessionMeta}>
                  <span>{session.messagesCount} сообщ.</span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    className={styles.deleteButton}
                    aria-label="Удалить диалог"
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

function formatRelativeTime(timestamp) {
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
  });
}

