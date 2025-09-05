import React, { useState, useEffect } from 'react';
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { SettingsManager } from '../lib/util/SettingsManager';
import '@aws-amplify/ui-react/styles.css';

interface AuthComponentProps {
  onEditConfigClick: () => void;
  children: React.ReactNode;
  onAuthStatusChange?: (isAuthenticated: boolean) => void; // Add callback for auth status
}

export const AuthComponent: React.FC<AuthComponentProps> = ({ 
  onEditConfigClick, 
  children,
  onAuthStatusChange
}) => {
  const [isConfigured, setIsConfigured] = useState(false);
  const [isCheckingConfig, setIsCheckingConfig] = useState(true);

  useEffect(() => {
    // Check if Amplify is properly configured
    const checkConfiguration = () => {
      const settings = SettingsManager.getSettings();
      const configured = settings && 
        settings.cognito.userPoolId && 
        settings.cognito.userPoolClientId && 
        settings.cognito.identityPoolId;
      
      console.log('Auth configuration check:', {
        hasSettings: !!settings,
        configured: !!configured,
        settings: settings?.cognito
      });
      
      setIsConfigured(!!configured);
      setIsCheckingConfig(false);
    };

    checkConfiguration();
  }, []);

  if (isCheckingConfig) {
    return (
      <div className="auth-loading">
        <div className="loading-spinner"></div>
        <p>Checking configuration...</p>
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div className="auth-prompt">
        <div className="auth-header">
          <h1>🔐 Authentication required</h1>
        </div>
        <div className="auth-content">
          <div className="config-required">
            <div className="config-icon">⚙️</div>
            <h2>Configuration Required</h2>
            <p>Please configure your Amazon Cognito settings to continue.</p>
            <button 
              className="config-btn"
              onClick={onEditConfigClick}
            >
              <span>🔧</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <Authenticator 
        hideSignUp={true}
        components={{
          SignIn: {
            Header() {
              return (
                <div className="auth-header">
                  <h1>🔐 Authentication required</h1>
                  <button 
                    className="config-btn-overlay"
                    onClick={onEditConfigClick}
                    title="Configure Settings"
                  >
                    <span>⚙️</span>
                  </button>
                </div>
              );
            }
          }
        }}
      >
        <AuthenticatedWrapper onEditConfigClick={onEditConfigClick} onAuthStatusChange={onAuthStatusChange}>
          {children}
        </AuthenticatedWrapper>
      </Authenticator>
    </div>
  );
};

const AuthenticatedWrapper: React.FC<AuthComponentProps> = ({ children, onAuthStatusChange }) => {
  const { user, authStatus } = useAuthenticator((context) => [context.user, context.authStatus]);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [credentialsReady, setCredentialsReady] = useState(false);
  const [hasNotifiedAuth, setHasNotifiedAuth] = useState(false); // Prevent double notification

  useEffect(() => {
    setIsAuthenticating(authStatus === 'configuring');
  }, [authStatus]);

  // Fetch and store credentials when user is authenticated
  useEffect(() => {
    const fetchCredentials = async () => {
      if (user && authStatus === 'authenticated') {
        try {
          console.log('🔐 AuthComponent: Fetching credentials for authenticated user');
          const session = await fetchAuthSession();
          if (session.credentials) {
            SettingsManager.saveCredentials(session.credentials);
            console.log('🔐 AuthComponent: Credentials saved, setting credentialsReady to true');
            setCredentialsReady(true);
          }
        } catch (error) {
          console.error('Error fetching credentials:', error);
        }
      }
    };

    fetchCredentials();
  }, [user, authStatus]);

  // Notify parent of authentication status changes (only once)
  useEffect(() => {
    if (onAuthStatusChange && credentialsReady && !hasNotifiedAuth) {
      console.log('🔐 AuthComponent: Notifying parent of authentication success');
      onAuthStatusChange(true);
      setHasNotifiedAuth(true);
    }
  }, [credentialsReady, onAuthStatusChange, hasNotifiedAuth]);

  if (isAuthenticating) {
    return (
      <div className="auth-loading">
        <div className="loading-spinner"></div>
        <p>Authenticating...</p>
      </div>
    );
  }

  if (user && credentialsReady) {
    return (
      <div className="auth-content">
        {children}
      </div>
    );
  }

  return (
    <div className="auth-prompt">
      <h2>Welcome to Nova Sonic Voice Chat</h2>
      <p>Please sign in with your credentials to continue</p>
    </div>
  );
};

export default AuthComponent;
