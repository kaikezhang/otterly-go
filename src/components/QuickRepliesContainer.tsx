import type { QuickReply } from '../types';
import { QuickReplyButton } from './QuickReplyButton';

interface QuickRepliesContainerProps {
  quickReplies: QuickReply[];
  onQuickReplyClick: (reply: QuickReply) => void;
  disabled?: boolean;
}

export function QuickRepliesContainer({
  quickReplies,
  onQuickReplyClick,
  disabled,
}: QuickRepliesContainerProps) {
  if (!quickReplies || quickReplies.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2 animate-fadeIn">
      {quickReplies.map((reply, index) => (
        <QuickReplyButton
          key={`${reply.text}-${index}`}
          reply={reply}
          onClick={() => onQuickReplyClick(reply)}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
