import { ScrollArea } from '../ui/scroll-area';
import { MessageSquare, Trash } from './icons';
import styles from './SessionList.module.css';

export function SessionList({ sessions, activeSessionId, onSelectSession, onDeleteSession }) {
  if (!sessions.length) {
    return (
      <div className={styles.emptyState}>
        <div>
          <div className={styles.emptyIcon}>
            <MessageSquare className={styles.iconLarge} />
          </div>
          <p>Начните новый диалог, чтобы увидеть историю здесь.</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className={styles.scrollAreaFull}>
      <div className={styles.sessionListWrapper}>
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
              </div>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onDeleteSession(session.id);
                }}
                className={styles.deleteButton}
                aria-label="Удалить диалог"
              >
                <Trash className={styles.iconSmall} />
              </button>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

