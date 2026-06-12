import { Outlet } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Header from "./components/layout/Header";
import { useOnline } from "./hooks/useOnline";

export default function App() {
  const online = useOnline();

  return (
    <div className="min-h-screen bg-white">
      {!online && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-500 px-4 py-2 text-center text-sm font-medium text-white shadow-md">
          网络连接已断开，请检查网络设置
        </div>
      )}
      <Header />
      <div className="pt-14">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </div>
    </div>
  );
}
