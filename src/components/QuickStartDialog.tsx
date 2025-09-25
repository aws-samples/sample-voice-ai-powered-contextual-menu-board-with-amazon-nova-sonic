import React from 'react';

interface QuickStartDialogProps {
  onLoadDefaults: () => void;
  onSkip: () => void;
}

const QuickStartDialog: React.FC<QuickStartDialogProps> = ({
  onLoadDefaults,
  onSkip
}) => {
  return (
    <div className="quick-start-overlay">
      <div className="quick-start-dialog">
        <div className="quick-start-header">
          <h2>🚀 Welcome to voice AI ordering system powered by Amazon Nova Sonic!</h2>
        </div>

        <div className="quick-start-content">
          <div className="quick-start-icon">
            🗣️🎙️🤖
          </div>

          <p className="quick-start-description">
            Get started quickly with our pre-configured experience,
            or set up your own custom configuration.
          </p>

          <div className="quick-start-features">
            <div className="feature-item">
              <span className="feature-icon">🤖</span>
              <span>AI-powered voice ordering</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🛠️</span>
              <span>Pre-built tools and backend integrations</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🎯</span>
              <span>Ready-to-use third party APIs</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">⚡</span>
              <span>Quick setup in under 2 minutes</span>
            </div>
          </div>

          <div className="quick-start-note">
            <strong>Note:</strong> You'll still need to configure your Amazon Cognito settings
            to enable authentication and voice features.
          </div>
        </div>

        <div className="quick-start-actions">
          <button
            className="quick-start-btn primary"
            onClick={onLoadDefaults}
          >
            🚀 Load Quick Start
          </button>
          <button
            className="quick-start-btn secondary"
            onClick={onSkip}
          >
            ⚙️ Manual Setup
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickStartDialog;
