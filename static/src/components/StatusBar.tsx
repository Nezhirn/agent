import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Phase } from '../types';
import { Brain, Pencil, Wrench, ShieldQuestion, Loader2, Wifi, WifiOff, Shield, ShieldOff } from 'lucide-react';

interface Props {
  phase: Phase;
  startTime: number | null;
  wsStatus?: 'connected' | 'connecting' | 'reconnecting' | 'disconnected';
  allowAll?: boolean;
  onToggleAllowAll?: () => void;
}

const phaseConfig: Record<
  string,
  { label: string; icon: typeof Brain; color: string; dotColor: string; bgGlow: string; borderColor: string }
> = {
  waiting: {
    label: 'Ожидание ответа',
    icon: Loader2,
    color: 'text-text-secondary',
    dotColor: 'bg-text-muted',
    bgGlow: '',
    borderColor: 'border-border/50',
  },
  thinking: {
    label: 'Размышляет',
    icon: Brain,
    color: 'text-warning',
    dotColor: 'bg-warning',
    bgGlow: 'shadow-warning/5',
    borderColor: 'border-warning/20',
  },
  generating: {
    label: 'Генерирует ответ',
    icon: Pencil,
    color: 'text-accent',
    dotColor: 'bg-accent',
    bgGlow: 'shadow-accent/5',
    borderColor: 'border-accent/20',
  },
  tool: {
    label: 'Выполняет инструмент',
    icon: Wrench,
    color: 'text-success',
    dotColor: 'bg-success',
    bgGlow: 'shadow-success/5',
    borderColor: 'border-success/20',
  },
  confirming: {
    label: 'Ожидает подтверждения',
    icon: ShieldQuestion,
    color: 'text-warning',
    dotColor: 'bg-warning',
    bgGlow: 'shadow-warning/5',
    borderColor: 'border-warning/20',
  },
};

export default function StatusBar({ phase, startTime, wsStatus = 'connected', allowAll = false, onToggleAllowAll }: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (phase === 'idle' || !startTime) {
      setElapsed(0);
      return;
    }
    const interval = setInterval(() => {
      setElapsed((Date.now() - startTime) / 1000);
    }, 100);
    return () => clearInterval(interval);
  }, [phase, startTime]);

  if (phase === 'idle' && wsStatus === 'connected') return null;

  const config = phaseConfig[phase] || phaseConfig.waiting;
  const Icon = config.icon;

  // Индикатор WebSocket статуса
  const wsConfig = {
    connected: { icon: Wifi, color: 'text-success', label: 'Подключено' },
    connecting: { icon: Wifi, color: 'text-warning', label: 'Подключение...' },
    reconnecting: { icon: Wifi, color: 'text-warning', label: 'Переподключение...' },
    disconnected: { icon: WifiOff, color: 'text-error', label: 'Нет соединения' },
  };
  const wsInfo = wsConfig[wsStatus];
  const WsIcon = wsInfo.icon;

  return (
    <motion.div
      data-testid="status-bar"
      initial={{ opacity: 0, y: 10, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: 10, height: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as const }}
      className={`flex items-center justify-between gap-3 py-2.5 px-4 glass border-t ${config.borderColor} ${config.bgGlow ? `shadow-inner ${config.bgGlow}` : ''}`}
    >
      {/* Animated gradient line at top */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: phase === 'generating'
            ? 'linear-gradient(90deg, transparent, rgba(59,130,246,0.5), transparent)'
            : phase === 'thinking'
            ? 'linear-gradient(90deg, transparent, rgba(245,158,11,0.5), transparent)'
            : phase === 'tool'
            ? 'linear-gradient(90deg, transparent, rgba(16,185,129,0.5), transparent)'
            : 'linear-gradient(90deg, transparent, rgba(100,100,100,0.3), transparent)',
        }}
        animate={{
          backgroundPosition: ['0% 0%', '100% 0%'],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      />

      {/* Левая часть: статус фазы */}
      {phase !== 'idle' && (
        <div className={`flex items-center gap-2.5 ${config.color}`}>
          <motion.div
            animate={
              phase === 'waiting'
                ? { rotate: 360 }
                : { scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }
            }
            transition={
              phase === 'waiting'
                ? { duration: 1, repeat: Infinity, ease: 'linear' }
                : { duration: 2, repeat: Infinity, ease: 'easeInOut' }
            }
          >
            <Icon size={14} />
          </motion.div>
          <span className="text-xs font-medium">{config.label}</span>
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`}
                animate={{ scale: [0.4, 1.2, 0.4], opacity: [0.2, 0.9, 0.2] }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: i * 0.15,
                }}
              />
            ))}
          </div>
          {startTime && elapsed > 0 && (
            <span className="text-[11px] text-text-muted font-mono tabular-nums">
              {elapsed.toFixed(1)}s
            </span>
          )}
        </div>
      )}

      {/* Правая часть: WebSocket статус + кнопка разрешений */}
      <div className="flex items-center gap-3">
        {onToggleAllowAll && (
          <button
            onClick={onToggleAllowAll}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all duration-200 active:scale-95 ${
              allowAll
                ? 'bg-warning/10 text-warning border border-warning/20 hover:bg-warning/20'
                : 'bg-success/10 text-success border border-success/20 hover:bg-success/20'
            }`}
            title={allowAll ? 'Режим: авто-одобрение. Нажмите для переключения' : 'Режим: ручное подтверждение. Нажмите для переключения'}
          >
            {allowAll ? <ShieldOff size={12} /> : <Shield size={12} />}
            {allowAll ? 'Авто' : 'Контроль'}
          </button>
        )}
        <div className={`flex items-center gap-1.5 ${wsInfo.color}`}>
          <motion.div
            animate={wsStatus === 'connecting' || wsStatus === 'reconnecting' ? { opacity: [1, 0.3, 1] } : {}}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <WsIcon size={14} />
          </motion.div>
          <span className="text-xs font-medium">{wsInfo.label}</span>
        </div>
      </div>
    </motion.div>
  );
}
