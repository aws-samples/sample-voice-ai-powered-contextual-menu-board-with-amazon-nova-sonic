import React, { useState, useEffect } from 'react';

interface Sample {
  id: string;
  name: string;
  description: string;
  industry: string;
  complexity: string;
  icon: string;
  features: string[];
  estimatedSetupTime: string;
  tags: string[];
  preview: {
    image: string;
    description: string;
  };
}

interface SamplesIndex {
  version: string;
  lastUpdated: string;
  samples: Sample[];
}

interface QuickStartDialogProps {
  onLoadDefaults: () => void;
  onLoadSample: (sampleId: string) => void;
  onSkip: () => void;
}

const QuickStartDialog: React.FC<QuickStartDialogProps> = ({
  onLoadDefaults,
  onLoadSample,
  onSkip
}) => {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSample, setSelectedSample] = useState<string | null>(null);
  const [showSampleSelection, setShowSampleSelection] = useState(false);

  useEffect(() => {
    loadSamples();
  }, []);

  const loadSamples = async () => {
    try {
      const response = await fetch('/samples/samples-index.json');
      const samplesIndex: SamplesIndex = await response.json();
      setSamples(samplesIndex.samples);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load samples:', error);
      setLoading(false);
    }
  };

  const handleLoadSample = () => {
    if (selectedSample) {
      onLoadSample(selectedSample);
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity.toLowerCase()) {
      case 'beginner': return '#4CAF50';
      case 'intermediate': return '#FF9800';
      case 'advanced': return '#f44336';
      default: return '#2196F3';
    }
  };

  if (showSampleSelection) {
    return (
      <div className="quick-start-overlay">
        <div className="quick-start-dialog sample-selection">
          <div className="quick-start-header">
            <h2>Choose Your AI Experience</h2>
          </div>

          <div className="quick-start-content">
            <div className="quick-start-icon">
              🗣️🎙️🤖
            </div>

            <p className="quick-start-description">
              Select a pre-configured experience to get started quickly with Amazon Nova Sonic.
            </p>

            {loading ? (
              <div className="samples-loading">
                <div className="loading-spinner">⏳</div>
                <p>Loading samples...</p>
              </div>
            ) : (
              <div className="samples-grid">
                {samples.map((sample) => (
                  <div
                    key={sample.id}
                    className={`sample-card ${selectedSample === sample.id ? 'selected' : ''}`}
                    onClick={() => setSelectedSample(sample.id)}
                  >
                    <div className="sample-header">
                      <div className="sample-icon">{sample.icon}</div>
                      <div className="sample-info">
                        <h3>{sample.name}</h3>
                        <div className="sample-meta">
                          <span className="industry-badge">{sample.industry}</span>
                          <span
                            className="complexity-badge"
                            style={{ backgroundColor: getComplexityColor(sample.complexity) }}
                          >
                            {sample.complexity}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="sample-description">{sample.description}</p>

                    <div className="sample-features">
                      {sample.features.slice(0, 3).map((feature, index) => (
                        <div key={index} className="feature-tag">
                          {feature}
                        </div>
                      ))}
                      {sample.features.length > 3 && (
                        <div className="feature-tag more">
                          +{sample.features.length - 3} more
                        </div>
                      )}
                    </div>

                    <div className="sample-footer">
                      <span className="setup-time">⏱️ {sample.estimatedSetupTime}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="quick-start-actions">
            <button
              className="quick-start-btn secondary"
              onClick={() => setShowSampleSelection(false)}
            >
              ← Back
            </button>
            <button
              className="quick-start-btn primary"
              onClick={handleLoadSample}
              disabled={!selectedSample}
            >
              🚀 Load Sample
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
  }

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
            Get started quickly with our pre-configured experiences,
            or set up your own custom configuration.
          </p>

          <div className="quick-start-features">
            <div className="feature-item">
              <span className="feature-icon">🤖</span>
              <span>AI-powered voice ordering</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🛠️</span>
              <span>Pre-built tools and integrations</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🎯</span>
              <span>Multiple industry templates</span>
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
            onClick={() => setShowSampleSelection(true)}
          >
            🎯 Choose Sample
          </button>
          {/* <button
            className="quick-start-btn secondary"
            onClick={onLoadDefaults}
          >
            🚀 Load Default
          </button> */}
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