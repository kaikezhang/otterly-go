import type { QuickReply } from '../types';

interface QuickReplyButtonProps {
  reply: QuickReply;
  onClick: () => void;
  disabled?: boolean;
}

// Icon map for different action types
const ACTION_ICONS: Record<QuickReply['action'], string> = {
  confirm: '✓',
  info: 'ℹ️',
  alternative: '↻',
  custom: '✏️',
};

export function QuickReplyButton({ reply, onClick, disabled }: QuickReplyButtonProps) {
  const icon = ACTION_ICONS[reply.action];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border-2 border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
    >
      {icon && <span className="text-base">{icon}</span>}
      <span>{reply.text}</span>
    </button>
  );
}
