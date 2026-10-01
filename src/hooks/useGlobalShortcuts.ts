import { useEffect, useRef } from 'react';

export interface ShortcutHandlers {
  onNewWorkflow?: () => void;
  onSave?: () => void;
  onPublish?: () => void;
  onOpenAiGenerator?: () => void;
  onOpenShortcutsHelp?: () => void;
  onCloseModal?: () => void;
  onAddField?: () => void;
  onPreview?: () => void;
  onNavigate?: (tab: string) => void;
}

/**
 * Global Keyboard Shortcut Hook
 * Handles:
 * - Ctrl+N / Cmd+N: New workflow
 * - Ctrl+S / Cmd+S: Save current workflow draft
 * - Ctrl+Shift+P / Cmd+Shift+P: Publish workflow
 * - Ctrl+Shift+A / Cmd+Shift+A: Open AI workflow generator modal
 * - Ctrl+K / ?: Open keyboard shortcuts palette
 * - Esc: Close modals or cancel actions
 * - Alt+A: Add field (in builder)
 * - Alt+P: Preview workflow
 * - G then D: Go to Dashboard
 * - G then W: Go to Workflows
 * - G then S: Go to Submissions
 * - G then O: Go to Operator mode
 * - G then A: Go to Analytics
 * - G then T: Go to Test runner
 */
export function useGlobalShortcuts(handlers: ShortcutHandlers) {
  const gSequenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const waitingForSecondKeyRef = useRef<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept shortcuts when typing in standard text inputs unless it's Ctrl/Cmd-modified
      const target = e.target as HTMLElement;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      const hasMeta = e.ctrlKey || e.metaKey;

      // 1. Escape key (always allowed)
      if (e.key === 'Escape') {
        handlers.onCloseModal?.();
        return;
      }

      // 2. Ctrl+S or Cmd+S (Save)
      if (hasMeta && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        e.stopPropagation();
        // Fire custom event for any sub-components that manage local state
        window.dispatchEvent(new CustomEvent('collectai:save-workflow', { detail: { publish: false } }));
        handlers.onSave?.();
        return;
      }

      // 3. Ctrl+Shift+P or Cmd+Shift+P (Publish)
      if (hasMeta && e.shiftKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent('collectai:save-workflow', { detail: { publish: true } }));
        handlers.onPublish?.();
        return;
      }

      // 4. Ctrl+N or Cmd+N (Create New Workflow)
      if (hasMeta && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        e.stopPropagation();
        handlers.onNewWorkflow?.();
        return;
      }

      // 5. Ctrl+Shift+A or Cmd+Shift+A (AI Workflow Generator)
      if (hasMeta && e.shiftKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        e.stopPropagation();
        handlers.onOpenAiGenerator?.();
        return;
      }

      // 6. Ctrl+K or Cmd+K (Open Shortcuts / Quick Command)
      if (hasMeta && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        e.stopPropagation();
        handlers.onOpenShortcutsHelp?.();
        return;
      }

      // 7. Alt+A (Add Field in Builder)
      if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent('collectai:add-field'));
        handlers.onAddField?.();
        return;
      }

      // 8. Alt+P (Preview in Builder)
      if (e.altKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent('collectai:preview-workflow'));
        handlers.onPreview?.();
        return;
      }

      // If user is actively typing in a text field, do not process single-letter navigation sequences
      if (isInput) return;

      // 9. '?' key to open shortcuts help
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        handlers.onOpenShortcutsHelp?.();
        return;
      }

      // 10. 'G' sequential chords (e.g. G then W -> Workflows, G then D -> Dashboard)
      if (waitingForSecondKeyRef.current) {
        waitingForSecondKeyRef.current = false;
        if (gSequenceTimerRef.current) clearTimeout(gSequenceTimerRef.current);

        const chordKey = e.key.toLowerCase();
        switch (chordKey) {
          case 'd':
            e.preventDefault();
            handlers.onNavigate?.('dashboard');
            break;
          case 'w':
            e.preventDefault();
            handlers.onNavigate?.('workflows');
            break;
          case 's':
            e.preventDefault();
            handlers.onNavigate?.('submissions');
            break;
          case 'o':
            e.preventDefault();
            handlers.onNavigate?.('operator-mode');
            break;
          case 'a':
            e.preventDefault();
            handlers.onNavigate?.('analytics');
            break;
          case 't':
            e.preventDefault();
            handlers.onNavigate?.('testing');
            break;
          case 'l':
            e.preventDefault();
            handlers.onNavigate?.('public-links');
            break;
          default:
            break;
        }
        return;
      }

      if (e.key.toLowerCase() === 'g' && !hasMeta && !e.altKey) {
        waitingForSecondKeyRef.current = true;
        gSequenceTimerRef.current = setTimeout(() => {
          waitingForSecondKeyRef.current = false;
        }, 1200);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (gSequenceTimerRef.current) clearTimeout(gSequenceTimerRef.current);
    };
  }, [handlers]);
}
