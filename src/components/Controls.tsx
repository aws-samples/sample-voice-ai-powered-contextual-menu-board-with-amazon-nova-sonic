import React from 'react';

interface ControlsProps {
  isStreaming: boolean;
  onStartStreaming: () => void;
  onStopStreaming: () => void;
  disabled: boolean;
}

const Controls: React.FC<ControlsProps> = ({ 
  isStreaming, 
  onStartStreaming, 
  onStopStreaming, 
  disabled 
}) => {
  return (
    <div id="controls">
      <button 
        id="start" 
        className="start-button" 
        onClick={onStartStreaming}
        disabled={disabled || isStreaming}
      >
        🎙️ Start Streaming
      </button>
      <button 
        id="stop" 
        className="stop-button" 
        onClick={onStopStreaming}
        disabled={!isStreaming}
      >
        ⏹️ Stop Streaming
      </button>
    </div>
  );
};

export default Controls;
