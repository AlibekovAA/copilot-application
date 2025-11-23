'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import { QuestionPanel } from './components/copilot/QuestionPanel';
import { ConversationView } from './components/copilot/ConversationView';
import { SessionList } from './components/copilot/SessionList';
import { BackgroundBlobs } from './components/ui/BackgroundBlobs';
import { FullScreenLoading } from './components/ui/full-screen-loading';
import {
  createSession,
  createUserMessage,
  createAssistantMessage,
  getSessionTitle,
} from './utils/messageHelpers';
import { getDomainFromTopic } from './constants/topics';
import { ScrollArea } from './components/ui/scroll-area';
import { Plus, X } from './components/copilot/icons';
import { Logo } from './components/auth/Logo';
import { Toggle } from './components/ui/toggle';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { PasswordInput } from './components/ui/password-input';
import { Button } from './components/ui/button';
import { changePassword as apiChangePassword } from './utils/authApi';
import { API_URL, getAuthHeaders, handleApiError } from './utils/apiHelpers';
import { loadMessagesForConversation } from './utils/conversationApi';
import { useToast } from './components/ui/toast';
import { formatErrorDetail } from './utils/errorHelpers';
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
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const activeSessionIdRef = useRef(activeSessionId);
  const headerMenuRef = useRef(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

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
      setIsRedirecting(true);
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
        const errorMessage = await handleApiError(
          response,
          'Не удалось загрузить список диалогов',
        );
        toast.error(errorMessage);
        console.error(
          '[History] Failed to load conversations, status:',
          response.status,
        );
        return;
      }

      const data = await response.json();

      if (data.conversations && data.conversations.length > 0) {
        const loadedSessions = data.conversations.map((conv) => ({
          id: `conv-${conv.conversation_id}`,
          conversationId: conv.conversation_id,
          title: conv.title || 'Новый диалог',
          createdAt: conv.created_at,
          updatedAt: conv.created_at,
          messages: [],
        }));

        setSessions(loadedSessions);
        setActiveSessionId(loadedSessions[0].id);

        const firstConversation = loadedSessions[0];
        if (firstConversation.conversationId) {
          try {
            const messages = await loadMessagesForConversation(
              firstConversation.conversationId,
            );
            setSessions((prevSessions) => {
              const updated = [...prevSessions];
              if (updated[0]) {
                updated[0] = {
                  ...updated[0],
                  messages,
                };
              }
              return updated;
            });
          } catch (error) {
            console.error(
              '[History] Error loading messages for first conversation:',
              error,
            );
            toast.error(error.message || 'Ошибка при загрузке сообщений');
          }
        }
      }
    } catch (error) {
      console.error('[History] Error loading conversations:', error);
      toast.error('Ошибка при загрузке диалогов');
    }
  }, [isAuthenticated, userId, toast]);

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

  const ensureConversationId = useCallback(
    async (sessionId, question, files, selectedTopic) => {
      const currentSession = sessions.find((s) => s.id === sessionId);
      if (currentSession?.conversationId) {
        return currentSession.conversationId;
      }

      const domain = selectedTopic
        ? getDomainFromTopic(selectedTopic)
        : 'general';
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
        const errorMessage = await handleApiError(
          createResponse,
          'Не удалось создать диалог',
        );
        throw new Error(errorMessage);
      }

      const createData = await createResponse.json();
      const conversationId = createData.conversation_id;

      updateSession(sessionId, (session) => ({
        ...session,
        conversationId,
      }));

      return conversationId;
    },
    [sessions, updateSession],
  );

  const sendChatMessage = useCallback(
    async (conversationId, question, files, selectedTopic) => {
      const domain = selectedTopic
        ? getDomainFromTopic(selectedTopic)
        : 'general';
      const cleanedQuestion = question.trim();

      const formData = new FormData();
      formData.append('conversation_id', conversationId.toString());
      formData.append('message', cleanedQuestion || question);
      formData.append('domain', domain);

      if (files.length > 0) {
        files.forEach((file) => {
          formData.append('files', file);
        });
      }

      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {
          Authorization: getAuthHeaders().Authorization,
        },
        body: formData,
      });

      const statusMessages = {
        429: 'Превышен лимит запросов к языковой модели. Попробуйте позже.',
        422: 'Некорректные данные запроса. Проверьте сообщение и попробуйте снова.',
      };

      if (!response.ok) {
        const fallbackMessage =
          statusMessages[response.status] ||
          `Ошибка HTTP! Статус: ${response.status}`;
        const errorMessage = await handleApiError(response, fallbackMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data.response || 'Не удалось получить ответ';
    },
    [],
  );

  const addMessageToSession = useCallback(
    (sessionId, message, isError = false) => {
      updateSession(sessionId, (session) => ({
        ...session,
        messages: [...session.messages, message],
        updatedAt: message.timestamp,
      }));

      if (activeSessionIdRef.current === sessionId) {
        setTypingState({
          messageId: message.id,
          fullText: message.content,
        });
      }
    },
    [updateSession],
  );

  const handleSubmitQuestion = useCallback(
    async (question, files = [], selectedTopic = null) => {
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
        const conversationId = await ensureConversationId(
          sessionId,
          question,
          files,
          selectedTopic,
        );
        const answer = await sendChatMessage(
          conversationId,
          question,
          files,
          selectedTopic,
        );
        const assistantMessage = createAssistantMessage(answer);
        addMessageToSession(sessionId, assistantMessage);
      } catch (error) {
        console.error('Error generating answer:', error);
        const errorMessage =
          formatErrorDetail(error?.message) ||
          'Произошла ошибка при получении ответа. Попробуйте еще раз.';

        toast.error(errorMessage);
        const assistantMessage = createAssistantMessage(errorMessage);
        addMessageToSession(sessionId, assistantMessage);
      } finally {
        setIsLoadingAnswer(false);
      }
    },
    [
      activeSessionId,
      updateSession,
      ensureConversationId,
      sendChatMessage,
      addMessageToSession,
      toast,
    ],
  );

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

    if (session && session.conversationId && session.messages.length === 0) {
      try {
        const messages = await loadMessagesForConversation(
          session.conversationId,
        );
        updateSession(sessionId, (s) => ({
          ...s,
          messages,
        }));
      } catch (error) {
        console.error('[Messages] Error loading messages:', error);
        toast.error(error.message || 'Ошибка при загрузке сообщений');
      }
    }
  };

  const handleDeleteSession = useCallback(
    async (sessionId) => {
      const session = sessions.find((s) => s.id === sessionId);
      const sessionTitle = session?.title || 'Диалог';

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
            const errorMessage = await handleApiError(
              response,
              'Не удалось удалить чат',
            );
            toast.error(errorMessage);
            setSessions((prevSessions) => {
              const restored = [...prevSessions];
              const sessionIndex = restored.findIndex(
                (s) => s.id === sessionId,
              );
              if (sessionIndex === -1) {
                restored.push(session);
              }
              return restored.sort(
                (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
              );
            });
            console.error(
              '[Delete] Failed to delete conversation:',
              response.status,
            );
            return;
          }
        } catch (error) {
          console.error('[Delete] Error deleting conversation:', error);
          toast.error('Ошибка при удалении чата');
          setSessions((prevSessions) => {
            const restored = [...prevSessions];
            const sessionIndex = restored.findIndex((s) => s.id === sessionId);
            if (sessionIndex === -1) {
              restored.push(session);
            }
            return restored.sort(
              (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
            );
          });
          return;
        }
      }
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
    if (
      !changePasswordData.oldPassword ||
      changePasswordData.oldPassword.trim() === ''
    ) {
      toast.error('Введите текущий пароль');
      return;
    }

    if (
      !changePasswordData.newPassword ||
      changePasswordData.newPassword.trim() === ''
    ) {
      toast.error('Введите новый пароль');
      return;
    }

    if (changePasswordData.newPassword.length < 8) {
      toast.error('Новый пароль должен содержать минимум 8 символов');
      return;
    }

    if (
      !changePasswordData.confirmPassword ||
      changePasswordData.confirmPassword.trim() === ''
    ) {
      toast.error('Подтвердите новый пароль');
      return;
    }

    if (changePasswordData.newPassword !== changePasswordData.confirmPassword) {
      toast.error('Новые пароли не совпадают');
      return;
    }

    if (changePasswordData.oldPassword === changePasswordData.newPassword) {
      toast.error('Новый пароль должен отличаться от текущего');
      return;
    }

    try {
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
      toast.error(formatErrorDetail(error?.message) || 'Ошибка смены пароля');
    } finally {
      setIsChangingPassword(false);
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

  if (isLoading || !isAuthenticated || isRedirecting) {
    return <FullScreenLoading />;
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
                    onChange={toggleTheme}
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
                    isLoadingAnswer={isLoadingAnswer}
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
              <div className={styles.modalHeader}>
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
                  }}
                  className={styles.modalCloseButton}
                >
                  <X className={styles.passwordToggleIcon} />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleChangePassword();
                }}
                noValidate
              >
                <PasswordInput
                  id="old-password"
                  label="Текущий пароль"
                  value={changePasswordData.oldPassword}
                  onChange={(e) =>
                    setChangePasswordData((prev) => ({
                      ...prev,
                      oldPassword: e.target.value,
                    }))
                  }
                  required
                  className={styles.passwordInput}
                />

                <PasswordInput
                  id="new-password"
                  label="Новый пароль"
                  value={changePasswordData.newPassword}
                  onChange={(e) =>
                    setChangePasswordData((prev) => ({
                      ...prev,
                      newPassword: e.target.value,
                    }))
                  }
                  required
                  className={styles.passwordInput}
                  showValidation={changePasswordData.newPassword.length > 0}
                  isValid={
                    changePasswordData.newPassword.length >= 8
                      ? true
                      : changePasswordData.newPassword.length > 0
                      ? false
                      : null
                  }
                  errorMessage={
                    changePasswordData.newPassword.length > 0 &&
                    changePasswordData.newPassword.length < 8
                      ? 'Пароль должен содержать минимум 8 символов'
                      : ''
                  }
                />

                <PasswordInput
                  id="confirm-password"
                  label="Подтвердите новый пароль"
                  value={changePasswordData.confirmPassword}
                  onChange={(e) =>
                    setChangePasswordData((prev) => ({
                      ...prev,
                      confirmPassword: e.target.value,
                    }))
                  }
                  required
                  className={styles.passwordInput}
                  showValidation={changePasswordData.confirmPassword.length > 0}
                  isValid={
                    changePasswordData.confirmPassword.length > 0
                      ? changePasswordData.newPassword ===
                        changePasswordData.confirmPassword
                      : null
                  }
                  errorMessage={
                    changePasswordData.confirmPassword.length > 0 &&
                    changePasswordData.newPassword !==
                      changePasswordData.confirmPassword
                      ? 'Пароли не совпадают'
                      : ''
                  }
                />

                <div className={styles.passwordFormActions}>
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
