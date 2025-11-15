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

export function TopicButtons({ onSelectTopic, isLoading, activeTopics = [] }) {
  const handleTopicClick = (topic) => {
    if (activeTopics.includes(topic)) {
      onSelectTopic(activeTopics.filter(t => t !== topic));
    } else {
      onSelectTopic([...activeTopics, topic]);
    }
  };

  return (
    <div className={styles.container}>
      {TOPICS.map((topic) => (
        <button
          key={topic}
          onClick={() => handleTopicClick(topic)}
          disabled={isLoading}
          className={`${styles.topicButton} ${activeTopics.includes(topic) ? styles.active : ''}`}
        >
          {topic}
        </button>
      ))}
    </div>
  );
}

