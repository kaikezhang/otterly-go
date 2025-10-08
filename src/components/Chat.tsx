import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ChatMessage, QuickReply, SearchCriteria, Flight } from '../types';
import { SuggestionCard } from './SuggestionCard';
import { QuickRepliesContainer } from './QuickRepliesContainer';
import { FlightSearchForm } from './FlightSearchForm';
import { FlightCard } from './FlightCard';
import { BookingConfirmation } from './BookingConfirmation';

interface ChatProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  onAddSuggestionToDay: (suggestionId: string, dayIndex: number) => void;
  onSkipSuggestion: (suggestionId: string) => void;
  onQuickReplyClick: (reply: QuickReply) => void;
  onViewItinerary?: () => void;
  isLoading: boolean;
  maxDays: number;
  // Booking props
  onFlightSearch?: (criteria: SearchCriteria) => void;
  onSelectFlight?: (flight: Flight) => void;
  onViewFlightDetails?: (flight: Flight) => void;
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
  onFlightSearch,
  onSelectFlight,
  onViewFlightDetails,
}: ChatProps) {
  const navigate = useNavigate();
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
    <div className="flex flex-col h-full relative">
      {/* Floating Email Import Button - Only show after conversation starts */}
      {messages.length >= 2 && (
        <button
          onClick={() => navigate('/email-import')}
          className="absolute top-4 right-4 z-10 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 shadow-lg transition-all hover:scale-105 animate-fadeIn"
          title="Import bookings from email"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="text-sm font-medium">Import</span>
        </button>
      )}

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

              {/* Render flight search form if present */}
              {message.showFlightSearchForm && onFlightSearch && (
                <div className="mt-3">
                  <FlightSearchForm
                    onSearch={onFlightSearch}
                    isLoading={isLoading}
                    initialCriteria={message.flightCriteria}
                  />
                </div>
              )}

              {/* Render flight results if present */}
              {message.flightResults && message.flightResults.length > 0 && (
                <div className="space-y-3 mt-3">
                  {message.flightResults.map((flight) => (
                    <FlightCard
                      key={flight.id}
                      flight={flight}
                      onSelect={(f) => onSelectFlight?.(f)}
                      onViewDetails={(f) => onViewFlightDetails?.(f)}
                    />
                  ))}
                </div>
              )}

              {/* Render booking confirmation if present */}
              {message.booking && (
                <div className="mt-3">
                  <BookingConfirmation
                    booking={message.booking}
                    onAddToTrip={undefined}
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
      <div className="border-t border-gray-200 bg-white">
        {/* Email Import Tip Banner - Only show before conversation starts */}
        {messages.length <= 1 && (
          <div className="mx-4 mt-3 mb-2 animate-fadeIn">
            <button
              onClick={() => navigate('/email-import')}
              className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg px-4 py-3 hover:from-blue-100 hover:to-indigo-100 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 rounded-full p-2 group-hover:scale-110 transition-transform">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-gray-900">Import your bookings</div>
                    <div className="text-xs text-gray-600">Connect Gmail or Outlook to auto-add flights & hotels</div>
                  </div>
                </div>
                <svg className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          </div>
        )}

        <div className="p-4">
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
    </div>
  );
}
