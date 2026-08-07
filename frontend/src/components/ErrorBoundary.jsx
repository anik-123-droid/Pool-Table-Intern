import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', backgroundColor: '#1a1a1a', color: '#ff0055', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Application Error</h1>
          <p style={{ marginBottom: '1rem' }}>Something went critically wrong in the UI.</p>
          <div style={{ backgroundColor: '#0a0a0a', padding: '1rem', borderRadius: '8px', overflowX: 'auto' }}>
            <p style={{ fontWeight: 'bold' }}>{this.state.error && this.state.error.toString()}</p>
            <pre style={{ marginTop: '1rem', color: '#888' }}>
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </pre>
          </div>
          <button 
            onClick={() => window.location.reload()}
            style={{ marginTop: '2rem', padding: '10px 20px', backgroundColor: '#dd00ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
