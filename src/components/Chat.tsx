import { useState, useRef, useEffect } from 'react';
import type { ChatMessage, QuickReply } from '../types';
import { SuggestionCard } from './SuggestionCard';
import { QuickRepliesContainer } from './QuickRepliesContainer';

interface ChatProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  onAddSuggestionToDay: (suggestionId: string, dayIndex: number) => void;
  onSkipSuggestion: (suggestionId: string) => void;
  onQuickReplyClick: (reply: QuickReply) => void;
  onViewItinerary?: () => void;
  isLoading: boolean;
  maxDays: number;
}

export function Chat({
  messages,
  onSendMessage,
  onAddSuggestionToDay,
  onSkipSuggestion,
  onQuickReplyClick,
  onViewItinerary,
  isLoading,
  maxDays,
}: ChatProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleQuickReplyClick = (reply: QuickReply) => {
    // If action is "custom", just focus the input instead of sending the text
    if (reply.action === 'custom') {
      inputRef.current?.focus();
      return;
    }
    // Otherwise, send the quick reply text as a message
    onQuickReplyClick(reply);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-2xl ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              } rounded-lg px-4 py-3 shadow`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>

              {/* Render View Itinerary/Changes button if message has itinerary changes */}
              {message.role === 'assistant' && message.hasItineraryChanges && onViewItinerary && (
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={onViewItinerary}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-md"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {message.isNewItinerary ? 'View Itinerary' : 'View Changes'}
                  </button>
                </div>
              )}

              {/* Render suggestion card if present */}
              {message.suggestionCard && (
                <div className="mt-3">
                  <SuggestionCard
                    suggestion={message.suggestionCard}
                    onAddToDay={(dayIndex) =>
                      onAddSuggestionToDay(message.suggestionCard!.id, dayIndex)
                    }
                    onSkip={() => onSkipSuggestion(message.suggestionCard!.id)}
                    maxDays={maxDays}
                  />
                </div>
              )}

              {/* Render quick replies if present (only for assistant messages) */}
              {message.role === 'assistant' && message.quickReplies && (
                <QuickRepliesContainer
                  quickReplies={message.quickReplies}
                  onQuickReplyClick={handleQuickReplyClick}
                  disabled={isLoading}
                />
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-3 shadow">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.4s' }}
                ></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            aria-label="Message input"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
