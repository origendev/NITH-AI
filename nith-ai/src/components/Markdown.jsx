import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CodeBlock from './CodeBlock';

const remarkPlugins = [remarkGfm];

const components = {
  // Fenced blocks are rendered by CodeBlock, so drop the default <pre> wrapper.
  pre: ({ children }) => <>{children}</>,
  code({ node, className, children, ...props }) {
    const text = String(children);
    const match = /language-([\w+#-]+)/.exec(className || '');
    if (match || text.includes('\n')) {
      return <CodeBlock language={match?.[1]} code={text.replace(/\n$/, '')} />;
    }
    return (
      <code className="inline-code" {...props}>
        {children}
      </code>
    );
  },
  table: ({ children }) => (
    <div className="table-wrap">
      <table>{children}</table>
    </div>
  ),
  a: ({ node, href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
};

function Markdown({ children, streaming = false }) {
  return (
    <div className={`nith-prose ${streaming ? 'is-streaming' : ''}`}>
      <ReactMarkdown remarkPlugins={remarkPlugins} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

export default memo(Markdown);
