'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import { QuestionPanel } from './components/copilot/QuestionPanel';
import { ConversationView } from './components/copilot/ConversationView';
import { SessionList } from './components/copilot/SessionList';
import { BackgroundBlobs } from './components/ui/BackgroundBlobs';
import {
  createSession,
  createUserMessage,
  createAssistantMessage,
  getSessionTitle,
} from './utils/messageHelpers';
import { getDomainFromTopic } from './constants/topics';
import { ScrollArea } from './components/ui/scroll-area';
import { Plus, Eye, EyeOff, X } from './components/copilot/icons';
import { Logo } from './components/auth/Logo';
import { Toggle } from './components/ui/toggle';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Button } from './components/ui/button';
import { changePassword as apiChangePassword } from './utils/authApi';
import { API_URL, getAuthHeaders } from './utils/apiHelpers';
import { useToast } from './components/ui/toast';
import styles from './page.module.css';

export default function Home() {
  const { isAuthenticated, isLoading, userId, userEmail, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const initialSession = useMemo(() => createSession(), []);
  const [sessions, setSessions] = useState([initialSession]);
  const [activeSessionId, setActiveSessionId] = useState(initialSession.id);
  const [isLoadingAnswer, setIsLoadingAnswer] = useState(false);
  const [typingState, setTypingState] = useState({
    messageId: null,
    fullText: '',
  });
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [changePasswordData, setChangePasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changePasswordError, setChangePasswordError] = useState(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const activeSessionIdRef = useRef(activeSessionId);
  const headerMenuRef = useRef(null);

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isHeaderMenuOpen &&
        headerMenuRef.current &&
        !headerMenuRef.current.contains(event.target)
      ) {
        setIsHeaderMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isHeaderMenuOpen]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth');
    }
  }, [isAuthenticated, isLoading, router]);

  const loadConversations = useCallback(async () => {
    if (!isAuthenticated || !userId) return;

    try {
      const response = await fetch(
        `${API_URL}/conversations?limit=50&offset=0`,
        {
          headers: getAuthHeaders(),
        },
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

        const firstConversation = loadedSessions[0];
        if (firstConversation.conversationId) {
          try {
            console.log(
              '[History] Loading messages for first conversation:',
              firstConversation.conversationId,
            );
            const messagesResponse = await fetch(
              `${API_URL}/conversations/${firstConversation.conversationId}/messages`,
              {
                headers: getAuthHeaders(),
              },
            );

            if (messagesResponse.ok) {
              const messagesData = await messagesResponse.json();
              console.log(
                '[History] Loaded messages for first conversation:',
                messagesData,
              );

              setSessions((prevSessions) => {
                const updated = [...prevSessions];
                if (updated[0]) {
                  updated[0] = {
                    ...updated[0],
                    messages: messagesData.messages || [],
                  };
                }
                return updated;
              });
            }
          } catch (error) {
            console.error(
              '[History] Error loading messages for first conversation:',
              error,
            );
          }
        }
      } else {
        console.log('[History] No conversations found in database');
      }
    } catch (error) {
      console.error('[History] Error loading conversations:', error);
    }
  }, [isAuthenticated, userId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

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

  const handleSubmitQuestion = async (
    question,
    files = [],
    selectedTopic = null,
  ) => {
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

      const domain = selectedTopic
        ? getDomainFromTopic(selectedTopic)
        : 'general';
      const cleanedQuestion = question.trim();

      const currentSession = sessions.find((s) => s.id === sessionId);
      let conversationId = currentSession?.conversationId;

      if (!conversationId) {
        const conversationTitle = getSessionTitle(question, files);

        const createResponse = await fetch(`${API_URL}/conversations`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            title: conversationTitle,
            business_context: domain,
          }),
        });

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

      const formData = new FormData();
      formData.append('conversation_id', conversationId.toString());
      formData.append('message', cleanedQuestion || question);
      formData.append('domain', domain);

      if (files.length > 0) {
        files.forEach((file) => {
          formData.append('files', file);
        });
      }

      const authHeaders = getAuthHeaders();
      const headers = {
        Authorization: authHeaders.Authorization,
      };

      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: headers,
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `HTTP error! status: ${response.status}`,
        );
      }

      const data = await response.json();
      answer = data.response || 'Не удалось получить ответ';

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
        console.log(
          '[Messages] Loading messages from:',
          `${API_URL}/conversations/${session.conversationId}/messages`,
        );

        const response = await fetch(
          `${API_URL}/conversations/${session.conversationId}/messages`,
          {
            headers: getAuthHeaders(),
          },
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

  const handleDeleteSession = useCallback(
    async (sessionId) => {
      const session = sessions.find((s) => s.id === sessionId);

      if (session?.conversationId) {
        try {
          const response = await fetch(
            `${API_URL}/conversations/${session.conversationId}`,
            {
              method: 'DELETE',
              headers: getAuthHeaders(),
            },
          );

          if (!response.ok) {
            console.error(
              '[Delete] Failed to delete conversation:',
              response.status,
            );
            toast.error('Не удалось удалить чат');
            return;
          }

          console.log(
            '[Delete] Successfully deleted conversation:',
            session.conversationId,
          );
        } catch (error) {
          console.error('[Delete] Error deleting conversation:', error);
          toast.error('Ошибка при удалении чата');
          return;
        }
      }

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
    },
    [sessions, toast],
  );

  const toggleHeaderMenu = () => {
    setIsHeaderMenuOpen((prev) => !prev);
  };

  const closeHeaderMenu = () => {
    setIsHeaderMenuOpen(false);
  };

  const handleChangePassword = async () => {
    if (changePasswordData.newPassword !== changePasswordData.confirmPassword) {
      setChangePasswordError('Новые пароли не совпадают');
      return;
    }

    try {
      setChangePasswordError(null);
      setIsChangingPassword(true);
      await apiChangePassword(
        changePasswordData.oldPassword,
        changePasswordData.newPassword,
      );
      setIsChangePasswordOpen(false);
      setChangePasswordData({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      toast.success('Пароль успешно изменен');
    } catch (error) {
      setChangePasswordError(error.message || 'Ошибка смены пароля');
    } finally {
      setIsChangingPassword(false);
    }
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
          <div className={styles.headerMenu} ref={headerMenuRef}>
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
                    {userEmail || 'user@example.com'}
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
                    setIsChangePasswordOpen(true);
                  }}
                  className={styles.headerDropdownItem}
                  role="menuitem"
                >
                  Сменить пароль
                </button>
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

      {isChangePasswordOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => setIsChangePasswordOpen(false)}
        >
          <Card
            className={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <CardTitle>Сменить пароль</CardTitle>
                <button
                  type="button"
                  onClick={() => {
                    setIsChangePasswordOpen(false);
                    setChangePasswordData({
                      oldPassword: '',
                      newPassword: '',
                      confirmPassword: '',
                    });
                    setChangePasswordError(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'inherit',
                  }}
                >
                  <X style={{ width: '1.5rem', height: '1.5rem' }} />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleChangePassword();
                }}
              >
                <div style={{ marginBottom: '0.75rem' }}>
                  <Label htmlFor="old-password">Текущий пароль</Label>
                  <div style={{ position: 'relative' }}>
                    <Input
                      id="old-password"
                      type={showOldPassword ? 'text' : 'password'}
                      value={changePasswordData.oldPassword}
                      onChange={(e) =>
                        setChangePasswordData((prev) => ({
                          ...prev,
                          oldPassword: e.target.value,
                        }))
                      }
                      required
                      style={{
                        width: '100%',
                        height: '1.75rem',
                        fontSize: '0.875rem',
                        padding: '0.25rem 0.5rem',
                        paddingRight: '2.5rem',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPassword(!showOldPassword)}
                      style={{
                        position: 'absolute',
                        right: '0.5rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {showOldPassword ? (
                        <EyeOff
                          style={{ width: '1.25rem', height: '1.25rem' }}
                        />
                      ) : (
                        <Eye style={{ width: '1.25rem', height: '1.25rem' }} />
                      )}
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '0.75rem' }}>
                  <Label htmlFor="new-password">Новый пароль</Label>
                  <div style={{ position: 'relative' }}>
                    <Input
                      id="new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      value={changePasswordData.newPassword}
                      onChange={(e) =>
                        setChangePasswordData((prev) => ({
                          ...prev,
                          newPassword: e.target.value,
                        }))
                      }
                      required
                      style={{
                        width: '100%',
                        height: '1.75rem',
                        fontSize: '0.875rem',
                        padding: '0.25rem 0.5rem',
                        paddingRight: '2.5rem',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      style={{
                        position: 'absolute',
                        right: '0.5rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {showNewPassword ? (
                        <EyeOff
                          style={{ width: '1.25rem', height: '1.25rem' }}
                        />
                      ) : (
                        <Eye style={{ width: '1.25rem', height: '1.25rem' }} />
                      )}
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '0.75rem' }}>
                  <Label htmlFor="confirm-password">
                    Подтвердите новый пароль
                  </Label>
                  <div style={{ position: 'relative' }}>
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={changePasswordData.confirmPassword}
                      onChange={(e) =>
                        setChangePasswordData((prev) => ({
                          ...prev,
                          confirmPassword: e.target.value,
                        }))
                      }
                      required
                      style={{
                        width: '100%',
                        height: '1.75rem',
                        fontSize: '0.875rem',
                        padding: '0.25rem 0.5rem',
                        paddingRight: '2.5rem',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      style={{
                        position: 'absolute',
                        right: '0.5rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {showConfirmPassword ? (
                        <EyeOff
                          style={{ width: '1.25rem', height: '1.25rem' }}
                        />
                      ) : (
                        <Eye style={{ width: '1.25rem', height: '1.25rem' }} />
                      )}
                    </button>
                  </div>
                </div>

                {changePasswordError && (
                  <div
                    style={{
                      color: '#ef4444',
                      marginBottom: '0.75rem',
                      fontSize: '0.875rem',
                    }}
                  >
                    {changePasswordError}
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    gap: '0.5rem',
                    justifyContent: 'flex-end',
                  }}
                >
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsChangePasswordOpen(false);
                      setChangePasswordData({
                        oldPassword: '',
                        newPassword: '',
                        confirmPassword: '',
                      });
                      setChangePasswordError(null);
                    }}
                    disabled={isChangingPassword}
                    className={styles.cancelButton}
                  >
                    Отмена
                  </Button>
                  <Button
                    type="submit"
                    disabled={isChangingPassword}
                    className={styles.changePasswordButton}
                  >
                    {isChangingPassword ? 'Смена...' : 'Сменить пароль'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
