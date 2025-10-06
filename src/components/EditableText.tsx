import { useState, useRef, useEffect } from 'react';

interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  className?: string;
  textareaClassName?: string;
  multiline?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function EditableText({
  value,
  onChange,
  onBlur,
  className = '',
  textareaClassName = '',
  multiline = false,
  placeholder = 'Click to edit...',
  disabled = false,
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Select all text for easy editing
      if ('select' in inputRef.current) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  const handleClick = () => {
    if (!disabled) {
      setIsEditing(true);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEditValue(e.target.value);
  };

  const handleSave = () => {
    setIsEditing(false);
    const trimmedValue = editValue.trim();
    if (trimmedValue !== value && trimmedValue.length > 0) {
      onChange(trimmedValue);
    } else {
      // Revert if empty or unchanged
      setEditValue(value);
    }
    onBlur?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Enter' && e.metaKey) {
      // Cmd+Enter to save in multiline
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      // Cancel editing
      setEditValue(value);
      setIsEditing(false);
      onBlur?.();
    }
  };

  if (disabled) {
    return (
      <div className={className}>
        {value || <span className="text-gray-400">{placeholder}</span>}
      </div>
    );
  }

  if (isEditing) {
    if (multiline) {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={editValue}
          onChange={handleChange}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className={`w-full border-2 border-blue-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 ${textareaClassName}`}
          placeholder={placeholder}
          rows={3}
        />
      );
    } else {
      return (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={editValue}
          onChange={handleChange}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className={`w-full border-2 border-blue-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 ${textareaClassName}`}
          placeholder={placeholder}
        />
      );
    }
  }

  return (
    <div
      onClick={handleClick}
      className={`cursor-pointer hover:bg-blue-50 rounded px-2 py-1 -mx-2 -my-1 transition-colors ${className}`}
      title="Click to edit"
    >
      {value || <span className="text-gray-400">{placeholder}</span>}
    </div>
  );
}
