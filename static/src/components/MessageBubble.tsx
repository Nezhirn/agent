import { useRef, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { User, Bot, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import ThinkingBlock from './ThinkingBlock';
import ToolBlock from './ToolBlock';
import { renderMarkdown, highlightAll } from '../utils/markdown';
import type { ToolCall } from '../types';

interface Props {
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
  toolCalls?: ToolCall[];
  toolResults?: Array<{ content: string; name?: string; isDenied?: boolean }>;
  isStreaming?: boolean;
  isStreamingThinking?: boolean;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback для HTTP или старых браузеров
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.cssText = 'position:fixed;opacity:0;left:-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Игнорируем если и fallback не работает
      }
    }
  };

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 rounded-lg bg-bg-tertiary/80 border border-border/40 text-text-muted hover:text-text-primary hover:bg-bg-hover transition-all duration-200 opacity-0 group-hover:opacity-100 z-10"
      title="Копировать"
    >
      {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
    </motion.button>
  );
}

export default function MessageBubble({
  role,
  content,
  thinking,
  toolCalls,
  toolResults,
  isStreaming,
  isStreamingThinking,
}: Props) {
  const contentRef = useRef<HTMLDivElement>(null);

  const renderedContent = useMemo(() => {
    if (!content) return '';
    return renderMarkdown(content);
  }, [content]);

  useEffect(() => {
    if (contentRef.current) {
      highlightAll(contentRef.current);
    }
  }, [renderedContent]);

  if (role === 'user') {
    return (
      <div data-testid="user-message" className="flex justify-end">
        <div className="flex items-end gap-2.5 max-w-[80%] lg:max-w-[65%]">
          <div className="relative group">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-accent to-accent-dark rounded-2xl rounded-br-md blur-xl opacity-15 group-hover:opacity-25 transition-opacity duration-500" />
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="relative bg-gradient-to-br from-accent to-accent-dark text-white rounded-2xl rounded-br-md px-5 py-3.5 shadow-lg shadow-accent/10"
            >
              <CopyButton text={content} />
              <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                {content}
              </div>
            </motion.div>
          </div>
          <motion.div
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
            className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-accent/20 to-accent/10 border border-accent/20 flex items-center justify-center mb-1"
          >
            <User size={13} className="text-accent" />
          </motion.div>
        </div>
      </div>
    );
  }

  // Assistant
  return (
    <div className="flex justify-start">
      <div className="flex items-start gap-2.5 max-w-[88%] lg:max-w-[78%]">
        <motion.div
          initial={{ scale: 0, rotate: 90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-purple/20 to-purple/10 border border-purple/20 flex items-center justify-center mt-1"
        >
          <Bot size={13} className="text-purple" />
        </motion.div>
        <div className="flex-1 min-w-0 space-y-2">
          {/* Thinking */}
          {thinking && (
            <ThinkingBlock content={thinking} isStreaming={isStreamingThinking} />
          )}

          {/* Tool calls */}
          {toolCalls && toolCalls.length > 0 && (
            <div className="space-y-1.5">
              {toolCalls.map((tc, i) => {
                const tr = toolResults?.[i];
                return (
                  <ToolBlock
                    key={i}
                    name={tc.function.name}
                    args={tc.function.arguments as Record<string, unknown>}
                    result={tr?.content}
                    isDenied={tr?.isDenied}
                  />
                );
              })}
            </div>
          )}

          {/* Content */}
          {(content || isStreaming) && (
            <div className="relative group">
              <motion.div
                initial={{ opacity: 0.6, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-bg-secondary/80 backdrop-blur-sm border border-border/60 rounded-2xl rounded-tl-md px-5 py-4 shadow-sm transition-all duration-300 hover:border-border-light/60 hover:shadow-md hover:shadow-black/10"
              >
                <CopyButton text={content} />
                <div
                  ref={contentRef}
                  className={`markdown-content text-sm text-text-primary ${
                    isStreaming && content ? 'streaming-cursor' : ''
                  }`}
                  dangerouslySetInnerHTML={{ __html: renderedContent || '' }}
                />
                {isStreaming && !content && (
                  <div className="flex items-center gap-2.5 py-1">
                    <div className="flex gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="w-2 h-2 rounded-full bg-accent/50"
                          animate={{
                            scale: [0.6, 1.2, 0.6],
                            opacity: [0.3, 1, 0.3],
                          }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: 'easeInOut',
                            delay: i * 0.2,
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-text-muted">Генерация...</span>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
