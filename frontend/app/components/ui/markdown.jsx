'use client';
import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import styles from './markdown.module.css';

const TypingCaret = () => (
  <span className={styles.typingCaret} />
);

export function Markdown({ children, className, showTypingIndicator = false }) {
  const content = useMemo(() => {
    return typeof children === 'string' ? children : String(children || '');
  }, [children]);
  return (
    <div className={`${styles.markdown} ${className || ''}`}>
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className={styles.paragraph}>{children}</p>,
          h1: ({ children }) => <h1 className={styles.heading1}>{children}</h1>,
          h2: ({ children }) => <h2 className={styles.heading2}>{children}</h2>,
          h3: ({ children }) => <h3 className={styles.heading3}>{children}</h3>,
          h4: ({ children }) => <h4 className={styles.heading4}>{children}</h4>,
          strong: ({ children }) => <strong className={styles.strong}>{children}</strong>,
          em: ({ children }) => <em className={styles.em}>{children}</em>,
          ul: ({ children }) => <ul className={styles.list}>{children}</ul>,
          ol: ({ children }) => <ol className={styles.orderedList}>{children}</ol>,
          li: ({ children }) => <li className={styles.listItem}>{children}</li>,
          code: ({ children, className: codeClassName }) => {
            const isInline = !codeClassName;
            return isInline ? (
              <code className={styles.inlineCode}>{children}</code>
            ) : (
              <code className={styles.codeBlock}>{children}</code>
            );
          },
          pre: ({ children }) => <pre className={styles.pre}>{children}</pre>,
          blockquote: ({ children }) => <blockquote className={styles.blockquote}>{children}</blockquote>,
          hr: () => <hr className={styles.hr} />,
          a: ({ href, children }) => (
            <a href={href} className={styles.link} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
      {showTypingIndicator && <TypingCaret />}
    </div>
  );
}
