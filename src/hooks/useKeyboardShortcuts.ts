import { useEffect } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  description: string;
  handler: () => void;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const matchingShortcut = shortcuts.find(
        (shortcut) =>
          shortcut.key.toLowerCase() === event.key.toLowerCase() &&
          !!shortcut.ctrlKey === (event.ctrlKey || event.metaKey) &&
          !!shortcut.shiftKey === event.shiftKey &&
          !!shortcut.altKey === event.altKey
      );

      if (matchingShortcut) {
        const target = event.target as HTMLElement;
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable
        ) {
          return;
        }

        event.preventDefault();
        matchingShortcut.handler();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
}

export const defaultShortcuts = {
  SAVE: { key: 's', ctrlKey: true, description: 'Save' },
  DUPLICATE: { key: 'd', ctrlKey: true, description: 'Duplicate' },
  DELETE: { key: 'Delete', description: 'Delete selected' },
  NEW: { key: 'n', ctrlKey: true, description: 'New item' },
  SEARCH: { key: 'f', ctrlKey: true, description: 'Search' },
  HELP: { key: '?', shiftKey: true, description: 'Show help' },
  ESCAPE: { key: 'Escape', description: 'Close/Cancel' },
};
