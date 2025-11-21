'use client';
import ReactMarkdown from 'react-markdown';
import styles from './markdown.module.css';

export function Markdown({ children, className }) {
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
          code: ({ children, className }) => {
            const isInline = !className;
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
        {children}
      </ReactMarkdown>
    </div>
  );
}
