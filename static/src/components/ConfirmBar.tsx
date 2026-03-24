import { motion } from 'framer-motion';
import {
  ShieldAlert,
  Check,
  CheckCheck,
  X,
  Terminal,
  Server,
} from 'lucide-react';

interface Props {
  name: string;
  args: Record<string, unknown>;
  onAction: (action: string) => void;
}

export default function ConfirmBar({ name, args, onAction }: Props) {
  const isSSH = name.includes('ssh');
  const Icon = isSSH ? Server : Terminal;

  let commandText = '';
  if (name === 'run_bash_command' && args.command) {
    commandText = `$ ${args.command}`;
  } else if (name === 'run_ssh_command') {
    commandText = `${args.user || 'root'}@${args.host || '?'} $ ${args.command || ''}`;
  } else {
    commandText = JSON.stringify(args, null, 2);
  }

  return (
    <motion.div
      data-testid="confirm-bar"
      initial={{ opacity: 0, y: 30, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: 30, height: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="border-t-2 border-warning/50 glass overflow-hidden"
    >
      <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-warning/10 border border-warning/20 flex items-center justify-center">
            <ShieldAlert size={18} className="text-warning" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">
              Подтверждение действия
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Icon size={11} className="text-text-muted" />
              <span className="text-xs text-text-secondary font-mono">
                {name}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Command */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="p-3.5 rounded-xl bg-bg-primary/80 border border-border/60 font-mono text-sm text-text-primary whitespace-pre-wrap break-all max-h-32 overflow-y-auto leading-relaxed"
        >
          {commandText}
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="flex gap-2.5 flex-wrap"
        >
          <button
            onClick={() => onAction('allow')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-success hover:bg-success/90 text-white text-sm font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-success/25 active:scale-[0.96]"
          >
            <Check size={15} />
            Разрешить
          </button>
          <button
            onClick={() => onAction('allow_all')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent to-accent-dark hover:from-accent-dark hover:to-accent text-white text-sm font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-accent/25 active:scale-[0.96]"
          >
            <CheckCheck size={15} />
            Разрешить всё
          </button>
          <button
            onClick={() => onAction('deny')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-bg-tertiary/80 hover:bg-danger text-text-secondary hover:text-white border border-border/50 hover:border-danger text-sm font-semibold transition-all duration-200 active:scale-[0.96]"
          >
            <X size={15} />
            Отклонить
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}
