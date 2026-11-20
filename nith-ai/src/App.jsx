import { useCallback, useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import ChatArea from './components/ChatArea';
import SettingsModal from './components/SettingsModal';
import { useChat } from './hooks/useChat';
import { useTheme } from './hooks/useTheme';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useMediaQuery } from './hooks/useMediaQuery';
import { DEFAULT_MODEL, MODELS } from './services/api';
import { matchShortcut } from './utils/shortcuts';
import { conversationToMarkdown } from './utils/text';

export default function App() {
  const { theme, setTheme, toggle: toggleTheme } = useTheme();
  const [userName, setUserName] = useLocalStorage('nithai.userName', '');
  const [model, setModel] = useLocalStorage('nithai.model', DEFAULT_MODEL);
  const [collapsed, setCollapsed] = useLocalStorage('nithai.sidebarCollapsed', false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchTick, setSearchTick] = useState(0);

  const isMobile = useMediaQuery('(max-width: 767px)');
  const safeModel = MODELS.some((m) => m.id === model) ? model : DEFAULT_MODEL;

  const chat = useChat({ model: safeModel });
  const { newChat, selectChat, activeConversation } = chat;

  // Close the drawer when leaving mobile layout.
  useEffect(() => {
    if (!isMobile) setDrawerOpen(false);
  }, [isMobile]);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const handleNew = useCallback(() => {
    newChat();
    setDrawerOpen(false);
  }, [newChat]);

  const handleSelect = useCallback(
    (id) => {
      selectChat(id);
      setDrawerOpen(false);
    },
    [selectChat],
  );

  const toggleSidebar = useCallback(() => {
    if (isMobile) setDrawerOpen((open) => !open);
    else setCollapsed((value) => !value);
  }, [isMobile, setCollapsed]);

  const openSearch = useCallback(() => {
    if (isMobile) setDrawerOpen(true);
    else setCollapsed(false);
    setSearchTick((tick) => tick + 1);
  }, [isMobile, setCollapsed]);

  // Global keyboard shortcuts.
  useEffect(() => {
    const onKeyDown = (event) => {
      const action = matchShortcut(event);
      if (!action) return;
      event.preventDefault();
      if (action === 'new-chat') handleNew();
      else if (action === 'search') openSearch();
      else if (action === 'sidebar') toggleSidebar();
      else if (action === 'theme') toggleTheme();
      else if (action === 'settings') setSettingsOpen(true);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleNew, openSearch, toggleSidebar, toggleTheme]);

  // Browser tab title follows the open conversation.
  useEffect(() => {
    document.title = activeConversation ? `${activeConversation.title} · Nith AI` : 'Nith AI';
  }, [activeConversation]);

  const openSettings = useCallback(() => {
    setDrawerOpen(false);
    setSettingsOpen(true);
  }, []);

  return (
    <div className="flex h-full overflow-hidden bg-surface text-fg">
      <Sidebar
        conversations={chat.conversations}
        activeId={chat.activeId}
        streamingIds={chat.streamingIds}
        userName={userName}
        theme={theme}
        compact={!isMobile && collapsed}
        mobile={isMobile}
        open={drawerOpen}
        searchTick={searchTick}
        onSelect={handleSelect}
        onNew={handleNew}
        onRename={chat.renameChat}
        onDelete={chat.deleteChat}
        onToggleTheme={toggleTheme}
        onOpenSettings={openSettings}
        onToggleCollapse={toggleSidebar}
        onClose={closeDrawer}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          showMenuButton={isMobile}
          onOpenSidebar={() => setDrawerOpen(true)}
          models={MODELS}
          model={safeModel}
          onModelChange={setModel}
          canShare={!!activeConversation && activeConversation.messages.length > 0}
          getShareText={() => (activeConversation ? conversationToMarkdown(activeConversation, userName) : '')}
          onOpenSettings={openSettings}
        />
        <ChatArea
          conversation={activeConversation}
          isStreaming={chat.isStreaming}
          onSend={chat.send}
          onStop={chat.stop}
          onRegenerate={chat.regenerate}
        />
      </div>

      {settingsOpen && (
        <SettingsModal
          theme={theme}
          onTheme={setTheme}
          userName={userName}
          onUserName={setUserName}
          conversationCount={chat.conversations.length}
          onClearAll={chat.clearAll}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
