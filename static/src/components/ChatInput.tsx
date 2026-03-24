import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Square, Sparkles, Command } from 'lucide-react';

interface Props {
  disabled: boolean;
  isBusy: boolean;
  hasSession: boolean;
  onSend: (message: string) => void;
  onStop: () => void;
}

export default function ChatInput({
  disabled,
  isBusy,
  hasSession,
  onSend,
  onStop,
}: Props) {
  const [text, setText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [text, adjustHeight]);

  useEffect(() => {
    if (!isBusy && !disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isBusy, disabled]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || !hasSession || disabled) return;
    onSend(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isBusy) return;
      handleSend();
    }
    if (e.key === 'Escape' && isBusy) {
      onStop();
    }
  };

  const canSend = text.trim().length > 0 && hasSession && !disabled && !isBusy;
  const charCount = text.length;

  return (
    <div className="flex-shrink-0 glass border-t border-border/50 p-4 relative z-[2]">
      {/* Top gradient accent line */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: isFocused
            ? 'linear-gradient(90deg, transparent, rgba(59,130,246,0.4), rgba(168,85,247,0.3), rgba(6,182,212,0.4), transparent)'
            : 'linear-gradient(90deg, transparent, rgba(59,130,246,0.15), transparent)',
        }}
        animate={{ opacity: isFocused ? 1 : 0.7 }}
        transition={{ duration: 0.3 }}
      />

      <div className="max-w-3xl mx-auto">
        <motion.div
          className={`flex items-end gap-3 rounded-2xl transition-all duration-300 ${
            isFocused ? 'ring-1 ring-accent/20 shadow-lg shadow-accent/5' : ''
          }`}
          animate={{
            scale: isFocused ? 1.005 : 1,
          }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex-1 relative">
            {/* Placeholder icon */}
            <AnimatePresence>
              {!text && !disabled && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                >
                  <Sparkles size={14} className="text-text-muted/40" />
                </motion.div>
              )}
            </AnimatePresence>

            <textarea
              ref={textareaRef}
              data-testid="chat-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              disabled={disabled || isBusy}
              placeholder={
                !hasSession
                  ? 'Создайте или выберите чат...'
                  : isBusy
                  ? 'Ожидание ответа...'
                  : 'Напишите сообщение...'
              }
              rows={1}
              className={`w-full py-3.5 pr-4 text-sm rounded-2xl bg-bg-primary/80 border border-border/60 text-text-primary placeholder:text-text-muted/50 resize-none outline-none transition-all duration-300 focus:border-accent/30 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.06)] disabled:opacity-40 disabled:cursor-not-allowed ${
                !text && !disabled ? 'pl-10' : 'pl-4'
              }`}
              style={{ minHeight: '48px', maxHeight: '160px' }}
            />

            {/* Character count */}
            <AnimatePresence>
              {charCount > 100 && (
                <motion.span
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className={`absolute right-3 bottom-1.5 text-[10px] font-mono tabular-nums ${
                    charCount > 4000 ? 'text-danger/60' : 'text-text-muted/40'
                  }`}
                >
                  {charCount}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence mode="wait">
            {isBusy ? (
              <motion.button
                key="stop"
                data-testid="stop-button"
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 90 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                onClick={onStop}
                className="flex-shrink-0 w-11 h-11 rounded-xl bg-danger hover:bg-danger/90 text-white flex items-center justify-center transition-all duration-200 hover:shadow-lg hover:shadow-danger/25 active:scale-90"
                title="Остановить (Esc)"
              >
                <Square size={14} fill="currentColor" />
              </motion.button>
            ) : (
              <motion.button
                key="send"
                data-testid="send-button"
                initial={{ scale: 0, rotate: 90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: -90 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                onClick={handleSend}
                disabled={!canSend}
                className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-r from-accent to-accent-dark hover:from-accent-dark hover:to-accent text-white flex items-center justify-center transition-all duration-300 hover:shadow-lg hover:shadow-accent/25 disabled:from-bg-tertiary disabled:to-bg-tertiary disabled:text-text-muted disabled:shadow-none disabled:cursor-not-allowed active:scale-90"
                title="Отправить (Enter)"
              >
                <Send size={15} />
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="mt-2 flex items-center justify-center gap-3">
          <span className="text-[10px] text-text-muted/40 flex items-center gap-1">
            <Command size={9} /> Enter — отправить
          </span>
          <span className="text-[10px] text-text-muted/30">•</span>
          <span className="text-[10px] text-text-muted/40">
            Shift+Enter — новая строка
          </span>
          <span className="text-[10px] text-text-muted/30">•</span>
          <span className="text-[10px] text-text-muted/40">
            Esc — стоп
          </span>
        </div>
      </div>
    </div>
  );
}
