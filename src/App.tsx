import { Outlet, useLocation } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Header from "./components/layout/Header";
import { Toast } from "./components/feedback/Toast";
import { useOnline } from "./hooks/useOnline";

/** 沉浸式页面自带顶栏/全屏背景，隐藏全局 Header 避免双层栏 */
function isImmersiveRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/planning/") ||
    pathname.startsWith("/plan/") ||
    pathname.startsWith("/demo/detail")
  );
}

export default function App() {
  const online = useOnline();
  const location = useLocation();
  const immersive = isImmersiveRoute(location.pathname);

  return (
    <div className="min-h-screen bg-white">
      {!online && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-500 px-4 py-2 text-center text-sm font-medium text-white shadow-md">
          网络连接已断开，请检查网络设置
        </div>
      )}
      {!immersive && <Header />}
      <div className={immersive ? undefined : "pt-14"}>
        <ErrorBoundary>
          <div key={location.pathname} className="page-enter">
            <Outlet />
          </div>
        </ErrorBoundary>
      </div>
      <Toast />
    </div>
  );
}
