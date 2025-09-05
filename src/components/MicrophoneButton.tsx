import React from 'react';

interface MicrophoneButtonProps {
  isStreaming: boolean;
  onToggleStreaming: () => void;
  disabled: boolean;
}

const MicrophoneButton: React.FC<MicrophoneButtonProps> = ({ 
  isStreaming, 
  onToggleStreaming, 
  disabled 
}) => {
  return (
    <button 
      className={`microphone-button ${isStreaming ? 'streaming' : 'idle'} ${disabled ? 'disabled' : ''}`}
      onClick={onToggleStreaming}
      disabled={disabled}
      title={isStreaming ? 'Stop streaming' : 'Start streaming'}
    >
      {isStreaming ? (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>
        </svg>
      ) : (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C13.1046 2 14 2.89543 14 4V12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12V4C10 2.89543 10.8954 2 12 2Z" fill="currentColor"/>
          <path d="M19 10V12C19 16.4183 15.4183 20 11 20H10V22H14C14.5523 22 15 22.4477 15 23C15 23.5523 14.5523 24 14 24H10C9.44772 24 9 23.5523 9 23C9 22.4477 9.44772 22 10 22V20H9C4.58172 20 1 16.4183 1 12V10C1 9.44772 1.44772 9 2 9C2.55228 9 3 9.44772 3 10V12C3 15.3137 5.68629 18 9 18H15C18.3137 18 21 15.3137 21 12V10C21 9.44772 21.4477 9 22 9C22.5523 9 23 9.44772 23 10Z" fill="currentColor"/>
        </svg>
      )}
    </button>
  );
};

export default MicrophoneButton;
