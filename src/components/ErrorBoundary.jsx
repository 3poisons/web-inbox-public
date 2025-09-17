import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // 更新 state 使下一次渲染能够显示降级后的 UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // 记录错误信息
    console.error("ErrorBoundary 捕获到错误:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // 自定义降级 UI
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-center p-8">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-white mb-4">应用出现错误</h1>
            <p className="text-gray-400 mb-6">
              很抱歉，应用遇到了一个错误。请刷新页面重试。
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              刷新页面
            </button>
            {process.env.NODE_ENV === "development" && (
              <details className="mt-4 text-left">
                <summary className="text-gray-400 cursor-pointer">
                  错误详情 (开发模式)
                </summary>
                <pre className="text-red-400 text-sm mt-2 p-4 bg-gray-800 rounded overflow-auto">
                  {this.state.error?.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
