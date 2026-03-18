/** @jsxImportSource preact */
import { useState, useCallback } from 'preact/hooks';
import { ChatPanel } from './ChatPanel.tsx';
import type { AIChatConfig } from './ChatPanel.tsx';
import type { ArticleChatContext } from '../server/types.ts';

interface Props {
  config: AIChatConfig;
  articleContext?: ArticleChatContext;
}

export default function AIChatContainer({ config, articleContext }: Props) {
  const [open, setOpen] = useState(false);

  const handleToggle = useCallback(() => setOpen(prev => !prev), []);
  const handleClose = useCallback(() => setOpen(false), []);

  if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__aiChatToggle = handleToggle;
  }

  return (
    <ChatPanel
      open={open}
      onClose={handleClose}
      config={config}
      articleContext={articleContext}
    />
  );
}
