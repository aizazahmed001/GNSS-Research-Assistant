import { Component } from "react";

export class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return <pre style={{color: "red", padding: 20}}>{this.state.error.message}\n{this.state.error.stack}</pre>;
    }
    return this.props.children;
  }
}