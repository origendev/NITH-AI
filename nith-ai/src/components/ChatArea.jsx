import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import MessageBubble from './MessageBubble';
import WelcomeScreen from './WelcomeScreen';
import ChatInput from './ChatInput';

const NEAR_BOTTOM = 120;

export default function ChatArea({ conversation, isStreaming, onSend, onStop, onRegenerate }) {
  const scrollRef = useRef(null);
  const stick = useRef(true);
  const [showJump, setShowJump] = useState(false);

  const messages = conversation?.messages ?? [];
  const lastMessage = messages[messages.length - 1];

  const scrollToBottom = useCallback((smooth = false) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  // New conversation selected: jump straight to the latest message.
  useLayoutEffect(() => {
    stick.current = true;
    setShowJump(false);
    scrollToBottom();
  }, [conversation?.id, scrollToBottom]);

  // Follow the stream while the user is at the bottom.
  useEffect(() => {
    if (stick.current) scrollToBottom();
  }, [messages.length, lastMessage?.content, lastMessage?.error, scrollToBottom]);

  // When the user sends something, always bring it into view.
  useEffect(() => {
    if (lastMessage?.role === 'assistant' && !lastMessage.content && isStreaming) {
      stick.current = true;
      scrollToBottom(true);
    }
  }, [lastMessage?.id, lastMessage?.role, lastMessage?.content, isStreaming, scrollToBottom]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    stick.current = distance < NEAR_BOTTOM;
    setShowJump(distance > 240);
  };

  const empty = messages.length === 0;

  return (
    <main className="relative flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto">
        {empty ? (
          <WelcomeScreen onPick={(prompt) => onSend(prompt, [])} disabled={isStreaming} />
        ) : (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pb-8 pt-4">
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                isLast={index === messages.length - 1}
                isStreaming={isStreaming && index === messages.length - 1 && message.role === 'assistant'}
                onRegenerate={onRegenerate}
              />
            ))}
          </div>
        )}
      </div>

      {showJump && !empty && (
        <button
          type="button"
          onClick={() => {
            stick.current = true;
            scrollToBottom(true);
          }}
          aria-label="Scroll to latest message"
          className="absolute bottom-[132px] left-1/2 z-10 flex h-9 w-9 -translate-x-1/2 animate-fade-in items-center justify-center rounded-full border border-fg/15 bg-surface shadow-md hover:bg-input"
        >
          <ArrowDown size={18} />
        </button>
      )}

      <ChatInput
        isStreaming={isStreaming}
        onSend={onSend}
        onStop={onStop}
        focusKey={conversation?.id ?? 'new'}
      />
    </main>
  );
}
