import { Code, Compass, Lightbulb, PenLine } from 'lucide-react';
import Logo from './Logo';

const SUGGESTIONS = [
  {
    icon: Lightbulb,
    title: 'Learn something new',
    hint: 'Get a clear, simple explanation',
    prompt: 'Teach me something fascinating that most people don’t know, and explain it simply.',
  },
  {
    icon: PenLine,
    title: 'Write something',
    hint: 'Emails, posts, stories and more',
    prompt: 'Help me write a clear, friendly email. Ask me who it is for and what it should say.',
  },
  {
    icon: Code,
    title: 'Generate code',
    hint: 'Build, debug and explain code',
    prompt:
      'Write a clean Python function that finds duplicate items in a list, with a short explanation and an example.',
  },
  {
    icon: Compass,
    title: 'Explore an idea',
    hint: 'Think it through together',
    prompt: 'I want to explore an idea. Ask me a few questions to help me think it through.',
  },
];

export default function WelcomeScreen({ onPick, disabled }) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col items-center justify-center px-4 py-10 text-center">
      <Logo size={96} className="mb-6" />
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">What can I help you with today?</h1>
      <p className="mt-2 text-base text-muted">Your ideas, questions and curiosity start here.</p>

      <div className="mt-10 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
        {SUGGESTIONS.map(({ icon: Icon, title, hint, prompt }) => (
          <button
            key={title}
            type="button"
            disabled={disabled}
            onClick={() => onPick(prompt)}
            className="flex min-h-[76px] items-center gap-4 rounded-2xl border border-fg/10 px-4 py-3 text-left transition-colors hover:bg-fg/5 disabled:opacity-50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fg/[0.07]">
              <Icon size={20} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">{title}</span>
              <span className="block text-sm text-muted">{hint}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
