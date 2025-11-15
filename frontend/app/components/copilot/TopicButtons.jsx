'use client';
import { TOPICS } from '../../constants/topics';
import styles from './TopicButtons.module.css';

export function TopicButtons({ onSelectTopic, isLoading, activeTopics = [] }) {
  const handleTopicClick = (topic) => {
    onSelectTopic(activeTopics.includes(topic) ? [] : [topic]);
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
