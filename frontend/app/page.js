'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import { QuestionPanel } from './components/copilot/QuestionPanel';
import { ConversationView } from './components/copilot/ConversationView';
import { SessionList } from './components/copilot/SessionList';
import { BackgroundBlobs } from './components/ui/BackgroundBlobs';
import { generateMockAnswer } from './utils/mockLLM';
import {
  createSession,
  createUserMessage,
  createAssistantMessage,
  getSessionTitle,
} from './utils/messageHelpers';
import { extractDomainFromQuestion } from './constants/topics';
import { ScrollArea } from './components/ui/scroll-area';
import { Plus } from './components/copilot/icons';
import { Logo } from './components/auth/Logo';
import { Toggle } from './components/ui/toggle';
import styles from './page.module.css';

export default function Home() {
  const { isAuthenticated, isLoading, userId, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const initialSession = useMemo(() => createSession(), []);
  const [sessions, setSessions] = useState([initialSession]);
  const [activeSessionId, setActiveSessionId] = useState(initialSession.id);
  const [isLoadingAnswer, setIsLoadingAnswer] = useState(false);
  const [typingState, setTypingState] = useState({
    messageId: null,
    fullText: '',
  });
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

  useEffect(() => {
    const loadConversations = async () => {
      if (!isAuthenticated || !userId) return;

      try {
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(
          `${apiUrl}/conversations?user_id=${userId}&limit=50&offset=0`,
        );

        if (!response.ok) {
          console.error(
            '[History] Failed to load conversations, status:',
            response.status,
          );
          return;
        }

        const data = await response.json();
        console.log('[History] Loaded data:', data);

        if (data.conversations && data.conversations.length > 0) {
          const loadedSessions = data.conversations.map((conv) => ({
            id: `conv-${conv.conversation_id}`,
            conversationId: conv.conversation_id,
            title: conv.title || 'Новый диалог',
            createdAt: conv.created_at,
            updatedAt: conv.created_at,
            messages: [],
          }));

          console.log('[History] Setting sessions:', loadedSessions);
          setSessions(loadedSessions);
          setActiveSessionId(loadedSessions[0].id);
        } else {
          console.log('[History] No conversations found in database');
        }
      } catch (error) {
        console.error('[History] Error loading conversations:', error);
      }
    };

    loadConversations();
  }, [isAuthenticated, userId]);

  const updateSession = useCallback((sessionId, updater) => {
    setSessions((prevSessions) => {
      const sessionIndex = prevSessions.findIndex(
        (session) => session.id === sessionId,
      );
      if (sessionIndex === -1) {
        return prevSessions;
      }

      const targetSession = prevSessions[sessionIndex];
      const updatedSession = updater(targetSession);

      if (!updatedSession) {
        return prevSessions;
      }

      const remainingSessions = prevSessions.filter(
        (session) => session.id !== sessionId,
      );
      return [updatedSession, ...remainingSessions];
    });
  }, []);

  const handleSubmitQuestion = async (question, files = []) => {
    if (!question.trim() && files.length === 0) {
      return;
    }

    const sessionId = activeSessionId;
    const userMessage = createUserMessage(question, files);

    updateSession(sessionId, (session) => ({
      ...session,
      messages: [...session.messages, userMessage],
      title:
        session.messages.length === 0
          ? getSessionTitle(question, files)
          : session.title,
      updatedAt: userMessage.timestamp,
    }));

    setIsLoadingAnswer(true);
    setTypingState({ messageId: null, fullText: '' });

    try {
      let answer;

      if (files.length > 0) {
        answer = await generateMockAnswer(
          question || `Обработка ${files.length} файлов`,
          'business',
        );
      } else {
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

        const domain = extractDomainFromQuestion(question);
        const cleanedQuestion = question.replace(/^#[^\s]+\s*/, '').trim();

        const currentSession = sessions.find((s) => s.id === sessionId);
        let conversationId = currentSession?.conversationId;

        if (!conversationId) {
          const createResponse = await fetch(
            `${apiUrl}/conversations?user_id=${userId}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                title: 'Новый диалог',
                business_context: domain,
              }),
            },
          );

          if (!createResponse.ok) {
            throw new Error('Failed to create conversation');
          }

          const createData = await createResponse.json();
          conversationId = createData.conversation_id;

          updateSession(sessionId, (session) => ({
            ...session,
            conversationId: conversationId,
          }));
        }

        const response = await fetch(`${apiUrl}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
            conversation_id: conversationId,
            message: cleanedQuestion || question,
            domain: domain,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.detail || `HTTP error! status: ${response.status}`,
          );
        }

        const data = await response.json();
        answer = data.response || 'Не удалось получить ответ';
      }

      const assistantMessage = createAssistantMessage(answer);

      updateSession(sessionId, (session) => ({
        ...session,
        messages: [...session.messages, assistantMessage],
        updatedAt: assistantMessage.timestamp,
      }));

      if (activeSessionIdRef.current === sessionId) {
        setTypingState({ messageId: assistantMessage.id, fullText: answer });
      }
    } catch (error) {
      console.error('Error generating answer:', error);
      const errorMessage =
        'Произошла ошибка при получении ответа. Попробуйте еще раз.';
      const assistantMessage = createAssistantMessage(errorMessage);

      updateSession(sessionId, (session) => ({
        ...session,
        messages: [...session.messages, assistantMessage],
        updatedAt: assistantMessage.timestamp,
      }));

      if (activeSessionIdRef.current === sessionId) {
        setTypingState({
          messageId: assistantMessage.id,
          fullText: errorMessage,
        });
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
    setSessions((prevSessions) => [newSession, ...prevSessions]);
    setActiveSessionId(newSession.id);
    setTypingState({ messageId: null, fullText: '' });
    setIsHeaderMenuOpen(false);
  };

  const handleSelectSession = async (sessionId) => {
    setActiveSessionId(sessionId);
    setTypingState({ messageId: null, fullText: '' });

    const session = sessions.find((s) => s.id === sessionId);
    console.log('[Messages] Selected session:', session);

    if (session && session.conversationId && session.messages.length === 0) {
      try {
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        console.log(
          '[Messages] Loading messages from:',
          `${apiUrl}/conversations/${session.conversationId}/messages`,
        );

        const response = await fetch(
          `${apiUrl}/conversations/${session.conversationId}/messages?user_id=${userId}`,
        );

        if (response.ok) {
          const data = await response.json();
          console.log('[Messages] Loaded messages:', data);

          updateSession(sessionId, (s) => ({
            ...s,
            messages: data.messages || [],
          }));
        } else {
          console.error('[Messages] Failed to load, status:', response.status);
        }
      } catch (error) {
        console.error('[Messages] Error loading messages:', error);
      }
    }
  };

  const handleDeleteSession = useCallback((sessionId) => {
    setSessions((prevSessions) => {
      if (prevSessions.length === 0) {
        return prevSessions;
      }

      const remainingSessions = prevSessions.filter(
        (session) => session.id !== sessionId,
      );

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
    setIsHeaderMenuOpen((prev) => !prev);
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

  const activeSession =
    sessions.find((session) => session.id === activeSessionId) ?? sessions[0];

  const sessionSummaries = useMemo(
    () =>
      sessions.map((session) => ({
        id: session.id,
        title: session.title,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        messagesCount: session.messages.length,
        lastMessagePreview:
          session.messages[session.messages.length - 1]?.content,
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
      <BackgroundBlobs />
      <div className={styles.content}>
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
                  <p className={styles.headerDropdownSubtitle}>
                    user@example.com
                  </p>
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
        <div className={styles.mainLayout}>
          <aside className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
              <div className={styles.sidebarHeaderContent}></div>
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
            <ScrollArea className={styles.answerArea}>
              <div className={styles.answerContent}>
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
            </ScrollArea>

            <div className={styles.questionPanel}>
              <div className={styles.questionPanelContent}>
                <QuestionPanel
                  onSubmit={handleSubmitQuestion}
                  isLoading={isLoadingAnswer}
                />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
