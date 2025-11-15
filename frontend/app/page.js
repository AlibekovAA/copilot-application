'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import { QuestionPanel } from './components/copilot/QuestionPanel';
import { ConversationView } from './components/copilot/ConversationView';
import { SessionList } from './components/copilot/SessionList';
import { generateMockAnswer } from './utils/mockLLM';
import { ScrollArea } from './components/ui/scroll-area';
import { Logo } from './components/auth/Logo';
import { Plus } from './components/copilot/icons';
import { Toggle } from './components/ui/toggle';
import styles from './page.module.css';


const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

const createSession = () => {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    title: 'Новый диалог',
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
};

export default function Home() {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const initialSession = useMemo(() => createSession(), []);
  const [sessions, setSessions] = useState([initialSession]);
  const [activeSessionId, setActiveSessionId] = useState(initialSession.id);
  const [isLoadingAnswer, setIsLoadingAnswer] = useState(false);
  const [typingState, setTypingState] = useState({ messageId: null, fullText: '' });
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const activeSessionIdRef = useRef(activeSessionId);

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth');
    }
  }, [isAuthenticated, isLoading, router]);

  const updateSession = useCallback((sessionId, updater) => {
    setSessions(prevSessions => {
      const sessionIndex = prevSessions.findIndex(session => session.id === sessionId);
      if (sessionIndex === -1) {
        return prevSessions;
      }

      const targetSession = prevSessions[sessionIndex];
      const updatedSession = updater(targetSession);

      if (!updatedSession) {
        return prevSessions;
      }

      const remainingSessions = prevSessions.filter(session => session.id !== sessionId);
      return [updatedSession, ...remainingSessions];
    });
  }, []);

  const handleSubmitQuestion = async (question, files = []) => {
    if (!question.trim() && files.length === 0) {
      return;
    }

    const sessionId = activeSessionId;
    const timestamp = new Date().toISOString();
    
    let messageContent = question;
    if (files.length > 0) {
      const fileNames = files.map(f => f.name).join(', ');
      messageContent = question 
        ? `${question}\n\n[Прикреплено файлов: ${files.length} - ${fileNames}]`
        : `[Прикреплено файлов: ${files.length} - ${fileNames}]`;
    }

    const userMessage = {
      id: generateId(),
      role: 'user',
      content: messageContent,
      timestamp,
      files: files.length > 0 ? files.map(f => ({ name: f.name, size: f.size })) : undefined,
    };

    updateSession(sessionId, session => ({
      ...session,
      messages: [...session.messages, userMessage],
      title: session.messages.length === 0 
        ? (question || `Файлы (${files.length})`) 
        : session.title,
      updatedAt: timestamp,
    }));

    setIsLoadingAnswer(true);
    setTypingState({ messageId: null, fullText: '' });

    try {
      let answer;
      
      if (files.length > 0) {
        answer = await generateMockAnswer(
          question || `Обработка ${files.length} файлов`, 
          'business'
        );
      } else {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${apiUrl}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: question,
            domain: 'general',
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        answer = data.response || 'Не удалось получить ответ';
      }
      
      const answerMessageId = generateId();
      const answerTimestamp = new Date().toISOString();
      const assistantMessage = {
        id: answerMessageId,
        role: 'assistant',
        content: answer,
        timestamp: answerTimestamp,
      };

      updateSession(sessionId, session => ({
        ...session,
        messages: [...session.messages, assistantMessage],
        updatedAt: answerTimestamp,
      }));

      if (activeSessionIdRef.current === sessionId) {
        setTypingState({ messageId: answerMessageId, fullText: answer });
      }
    } catch (error) {
      console.error('Error generating answer:', error);
      const errorMessage = 'Произошла ошибка при получении ответа. Попробуйте еще раз.';
      const errorMessageId = generateId();
      const errorTimestamp = new Date().toISOString();
      const assistantMessage = {
        id: errorMessageId,
        role: 'assistant',
        content: errorMessage,
        timestamp: errorTimestamp,
      };

      updateSession(sessionId, session => ({
        ...session,
        messages: [...session.messages, assistantMessage],
        updatedAt: errorTimestamp,
      }));

      if (activeSessionIdRef.current === sessionId) {
        setTypingState({ messageId: errorMessageId, fullText: errorMessage });
      }
    } finally {
      setIsLoadingAnswer(false);
    }
  };

  const handleTypingComplete = () => {
    setTypingState({ messageId: null, fullText: '' });
  };

  const handleCreateNewSession = () => {
    const newSession = createSession();
    setSessions(prevSessions => [newSession, ...prevSessions]);
    setActiveSessionId(newSession.id);
    setTypingState({ messageId: null, fullText: '' });
    setIsHeaderMenuOpen(false);
  };

  const handleSelectSession = (sessionId) => {
    setActiveSessionId(sessionId);
    setTypingState({ messageId: null, fullText: '' });
  };

  const handleDeleteSession = useCallback((sessionId) => {
    setSessions(prevSessions => {
      if (prevSessions.length === 0) {
        return prevSessions;
      }

      const remainingSessions = prevSessions.filter(session => session.id !== sessionId);

      if (remainingSessions.length === prevSessions.length) {
        return prevSessions;
      }

      if (remainingSessions.length === 0) {
        const newSession = createSession();
        setActiveSessionId(newSession.id);
        setTypingState({ messageId: null, fullText: '' });
        return [newSession];
      }

      if (sessionId === activeSessionIdRef.current) {
        const nextActiveId = remainingSessions[0].id;
        setActiveSessionId(nextActiveId);
        setTypingState({ messageId: null, fullText: '' });
      }

      return remainingSessions;
    });
  }, []);

  const toggleHeaderMenu = () => {
    setIsHeaderMenuOpen(prev => !prev);
  };

  const closeHeaderMenu = () => {
    setIsHeaderMenuOpen(false);
  };

  const handleHeaderThemeToggle = (checked) => {
    if (checked && theme === 'dark') {
      toggleTheme();
    } else if (!checked && theme === 'light') {
      toggleTheme();
    }
  };

  const activeSession = sessions.find(session => session.id === activeSessionId) ?? sessions[0];

  const sessionSummaries = useMemo(
    () =>
      sessions.map(session => ({
        id: session.id,
        title: session.title,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        messagesCount: session.messages.length,
        lastMessagePreview: session.messages[session.messages.length - 1]?.content,
      })),
    [sessions],
  );

  if (isLoading) {
    return (
      <div className={styles.loadingScreen}>
        <p>Загрузка...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.backgroundGradient}></div>
      <div className={`${styles.blob} ${styles.blob1}`}></div>
      <div className={`${styles.blob} ${styles.blob2}`}></div>
      <div className={`${styles.blob} ${styles.blob3}`}></div>
      <div className={`${styles.blob} ${styles.blob4}`}></div>
      <div className={`${styles.blob} ${styles.blob5}`}></div>
      <div className={`${styles.blob} ${styles.blob6}`}></div>
      <div className={`${styles.blob} ${styles.blob7}`}></div>
      <div className={`${styles.blob} ${styles.blob8}`}></div>
      <div className={`${styles.blob} ${styles.blob9}`}></div>

      <div className={styles.content}>
        <div className={styles.mainLayout}>
          <aside className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
              <div className={styles.sidebarHeaderContent}>
              </div>
              <button
                type="button"
                onClick={handleCreateNewSession}
                className={styles.sidebarNewButton}
              >
                <Plus className={styles.iconSmall} />
                Новый диалог
              </button>
            </div>
            <div className={styles.sidebarContent}>
              <SessionList
                sessions={sessionSummaries}
                activeSessionId={activeSessionId}
                onSelectSession={handleSelectSession}
                onDeleteSession={handleDeleteSession}
              />
            </div>
          </aside>

          <main className={styles.mainArea}>
            <div className={styles.mainAreaHeader}>
              <div className={styles.headerMenu}>
                <button
                  type="button"
                  onClick={toggleHeaderMenu}
                  className={styles.headerUserButton}
                  aria-haspopup="true"
                  aria-expanded={isHeaderMenuOpen}
                >
                  <span className={styles.headerUserAvatar}>AV</span>
                  <span className={styles.headerUserCaret} aria-hidden="true" />
                </button>

                {isHeaderMenuOpen && (
                  <div className={styles.headerDropdown} role="menu">
                    <div className={styles.headerDropdownHeader}>
                      <span className={styles.headerDropdownTitle}>Профиль</span>
                      <p className={styles.headerDropdownSubtitle}>user@example.com</p>
                    </div>
                    <div className={styles.headerDropdownItem} role="menuitem">
                      <Toggle
                        checked={theme === 'light'}
                        onChange={handleHeaderThemeToggle}
                        label="Сменить тему"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        closeHeaderMenu();
                        logout();
                      }}
                      className={styles.headerDropdownItemDestructive}
                      role="menuitem"
                    >
                      Выйти
                    </button>
                  </div>
                )}
              </div>
            </div>
            <ScrollArea className={styles.answerArea}>
              <div className={styles.answerContent}>
                <div className={styles.conversationWrapper}>
                  {activeSession && activeSession.messages.length > 0 ? (
                    <ConversationView
                      messages={activeSession.messages}
                      typingState={typingState}
                      onTypingComplete={handleTypingComplete}
                    />
                  ) : (
                    <div className={styles.emptyState}>
                      <div className={styles.emptyStateIcon}>
                        <Logo className={styles.iconXLarge} />
                      </div>
                      <h2>Добро пожаловать в Business Copilot</h2>
                      <p>
                        Задайте любой бизнес-вопрос и получите качественный ответ.
                      </p>
                    </div>
                  )}
                </div>
                
                <div className={styles.questionPanelContent}>
                  <QuestionPanel
                    onSubmit={handleSubmitQuestion}
                    isLoading={isLoadingAnswer}
                  />
                </div>
              </div>
            </ScrollArea>
          </main>
        </div>
      </div>
    </div>
  );
}
