'use client';
import styles from './TopicButtons.module.css';

const TOPICS = [
  'юриспруденция',
  'маркетинг',
  'финансы',
  'управление',
  'продажи',
  'HR',
];

export function TopicButtons({ onSelectTopic, isLoading, activeTopic }) {
  const handleTopicClick = (topic) => {
    if (activeTopic === topic) {
      // Если кликнули на активную тему, деактивируем её
      onSelectTopic(null);
    } else {
      // Активируем новую тему
      onSelectTopic(topic);
    }
  };

  return (
    <div className={styles.container}>
      {TOPICS.map((topic) => (
        <button
          key={topic}
          onClick={() => handleTopicClick(topic)}
          disabled={isLoading}
          className={`${styles.topicButton} ${activeTopic === topic ? styles.active : ''}`}
        >
          {topic}
        </button>
      ))}
    </div>
  );
}

