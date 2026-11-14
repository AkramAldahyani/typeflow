import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

export interface TypingInputHandle {
  focus: () => void;
  blur: () => void;
}

interface Props {
  onChar: (ch: string) => void;
  onBackspace: (word: boolean) => void;
  onTab?: () => void;
  onEscape?: () => void;
  onFocusChange: (focused: boolean) => void;
  label: string;
  disabled?: boolean;
}

/**
 * A visually hidden textarea that owns keyboard input. Uses `beforeinput` so mobile keyboards work,
 * and cancels the default edit so the field never holds text.
 */
export const TypingInput = forwardRef<TypingInputHandle, Props>(function TypingInput(
  { onChar, onBackspace, onTab, onEscape, onFocusChange, label, disabled },
  ref,
) {
  const el = useRef<HTMLTextAreaElement>(null);
  const handlers = useRef({ onChar, onBackspace });
  handlers.current = { onChar, onBackspace };

  useImperativeHandle(ref, () => ({
    focus: () => el.current?.focus({ preventScroll: true }),
    blur: () => el.current?.blur(),
  }));

  useEffect(() => {
    const ta = el.current;
    if (!ta) return;
    const onBefore = (e: InputEvent) => {
      const t = e.inputType;
      if (t === 'insertText' && e.data) {
        e.preventDefault();
        for (const ch of e.data) handlers.current.onChar(ch === ' ' ? ' ' : ch);
      } else if (t === 'deleteContentBackward') {
        e.preventDefault();
        handlers.current.onBackspace(false);
      } else if (t === 'deleteWordBackward' || t === 'deleteSoftLineBackward') {
        e.preventDefault();
        handlers.current.onBackspace(true);
      } else if (t === 'insertLineBreak' || t === 'insertParagraph' || t === 'insertFromPaste' || t === 'insertFromDrop') {
        e.preventDefault();
      }
    };
    // IME and some Android keyboards compose text and cannot be cancelled; take the result when composing ends.
    const onCompEnd = (e: CompositionEvent) => {
      if (e.data) for (const ch of e.data) handlers.current.onChar(ch);
      ta.value = '';
    };
    const onInput = () => {
      if (!(ta as unknown as { isComposing?: boolean }).isComposing) ta.value = '';
    };
    ta.addEventListener('beforeinput', onBefore);
    ta.addEventListener('compositionend', onCompEnd);
    ta.addEventListener('input', onInput);
    return () => {
      ta.removeEventListener('beforeinput', onBefore);
      ta.removeEventListener('compositionend', onCompEnd);
      ta.removeEventListener('input', onInput);
    };
  }, []);

  return (
    <textarea
      ref={el}
      className="visually-hidden-input"
      aria-label={label}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      disabled={disabled}
      onFocus={() => onFocusChange(true)}
      onBlur={() => onFocusChange(false)}
      onKeyDown={(e) => {
        if (e.key === 'Tab' && onTab && !e.shiftKey) {
          e.preventDefault();
          onTab();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          onEscape?.();
          el.current?.blur();
        }
      }}
    />
  );
});
