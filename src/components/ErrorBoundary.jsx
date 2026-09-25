import { Component } from 'react'

/** Shows the error on screen instead of a blank page, with a retry button. */
export default class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(error, info) {
    console.error('SmartMamla crashed:', error, info?.componentStack)
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="mx-auto my-10 max-w-lg rounded-3xl border border-flag-200 bg-flag-50 p-6 text-sm text-flag-700 dark:border-flag-500/30 dark:bg-flag-500/10 dark:text-flag-300">
        <div className="text-base font-bold">Something went wrong · কিছু একটা ভুল হয়েছে</div>
        <pre className="mt-3 whitespace-pre-wrap break-words font-mono text-xs opacity-80">{String(this.state.error?.message || this.state.error)}</pre>
        <button onClick={() => this.setState({ error: null })} className="btn-primary mt-4">
          Try again · আবার চেষ্টা করুন
        </button>
      </div>
    )
  }
}
