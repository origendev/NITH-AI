import { memo } from 'react';
import { Check, Copy } from 'lucide-react';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css';
import markup from 'react-syntax-highlighter/dist/esm/languages/prism/markup';
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql';
import java from 'react-syntax-highlighter/dist/esm/languages/prism/java';
import c from 'react-syntax-highlighter/dist/esm/languages/prism/c';
import cpp from 'react-syntax-highlighter/dist/esm/languages/prism/cpp';
import csharp from 'react-syntax-highlighter/dist/esm/languages/prism/csharp';
import go from 'react-syntax-highlighter/dist/esm/languages/prism/go';
import rust from 'react-syntax-highlighter/dist/esm/languages/prism/rust';
import yaml from 'react-syntax-highlighter/dist/esm/languages/prism/yaml';
import markdown from 'react-syntax-highlighter/dist/esm/languages/prism/markdown';
import diff from 'react-syntax-highlighter/dist/esm/languages/prism/diff';
import { useCopy } from '../hooks/useCopy';

const LANGUAGES = {
  javascript, jsx, typescript, tsx, python, bash, json, css, markup, sql,
  java, c, cpp, csharp, go, rust, yaml, markdown, diff,
};
Object.entries(LANGUAGES).forEach(([name, grammar]) => SyntaxHighlighter.registerLanguage(name, grammar));

const ALIASES = {
  js: 'javascript', mjs: 'javascript', cjs: 'javascript',
  ts: 'typescript',
  py: 'python', python3: 'python',
  sh: 'bash', shell: 'bash', zsh: 'bash', console: 'bash',
  html: 'markup', xml: 'markup', svg: 'markup',
  yml: 'yaml',
  'c++': 'cpp',
  cs: 'csharp',
  md: 'markdown',
  jsonc: 'json',
  rs: 'rust',
  golang: 'go',
};

function resolveLanguage(name) {
  const key = (name || '').toLowerCase();
  const resolved = ALIASES[key] || key;
  return LANGUAGES[resolved] ? resolved : 'text';
}

function CodeBlock({ language, code }) {
  const [copied, copy] = useCopy();
  const label = language || 'text';

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-fg/10 bg-code text-sm">
      <div className="flex items-center justify-between bg-fg/[0.06] py-1.5 pl-4 pr-2 text-xs text-muted">
        <span className="font-mono">{label}</span>
        <button
          type="button"
          onClick={() => copy(code)}
          aria-label="Copy code"
          className="flex h-8 items-center gap-1.5 rounded-md px-2 hover:bg-fg/10 hover:text-fg"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy code'}
        </button>
      </div>
      <SyntaxHighlighter
        language={resolveLanguage(language)}
        useInlineStyles={false}
        PreTag="div"
        className="code-body"
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

export default memo(CodeBlock);
