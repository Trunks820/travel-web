import { Outlet } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Header } from "./components/layout/Header";
import { PageContainer } from "./components/layout/PageContainer";

export default function App() {
  return (
    <div className="min-h-screen bg-[#edf2f5]">
      <Header />
      <ErrorBoundary>
        <PageContainer>
          <Outlet />
        </PageContainer>
      </ErrorBoundary>
    </div>
  );
}
