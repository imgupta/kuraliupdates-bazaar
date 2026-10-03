import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('KuraliUpdates UI crashed:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: '#0f172a',
          color: '#fff',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            width: '100%',
            maxWidth: 560,
            background: '#fff',
            color: '#0f172a',
            borderRadius: 20,
            padding: 28,
            boxShadow: '0 20px 60px rgba(0,0,0,.35)'
          }}>
            <h1 style={{ margin: '0 0 10px', fontSize: 22 }}>KuraliUpdates could not load</h1>
            <p style={{ margin: '0 0 14px', color: '#475569', lineHeight: 1.5 }}>
              The application encountered a browser error while starting. Your account data has not been changed.
            </p>
            <pre style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              margin: 0,
              padding: 12,
              borderRadius: 12,
              background: '#f1f5f9',
              color: '#991b1b',
              fontSize: 12,
              overflow: 'auto'
            }}>{this.state.error.message || String(this.state.error)}</pre>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                marginTop: 16,
                width: '100%',
                border: 0,
                borderRadius: 12,
                padding: '12px 16px',
                background: '#f59e0b',
                color: '#fff',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              Reload Bazaar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
