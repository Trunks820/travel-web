import { createBrowserRouter } from "react-router-dom";
import { lazy, Suspense } from "react";
import App from "./App";

const InputPage = lazy(() => import("./pages/InputPage"));
const PlanningPage = lazy(() => import("./pages/PlanningPage"));
const ResultPage = lazy(() => import("./pages/ResultPage"));
const PlanDetailPage = lazy(() => import("./pages/PlanDetailPage"));
const DemoResultPage = lazy(() => import("./pages/DemoResultPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

function LazyPage({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary-200 border-t-primary-500" />
          <span className="text-xs text-sand-400">加载中…</span>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: (
          <LazyPage>
            <InputPage />
          </LazyPage>
        ),
      },
      {
        path: "planning/:jobId",
        element: (
          <LazyPage>
            <PlanningPage />
          </LazyPage>
        ),
      },
      {
        path: "result/:resultId",
        element: (
          <LazyPage>
            <ResultPage />
          </LazyPage>
        ),
      },
      {
        path: "demo",
        element: (
          <LazyPage>
            <DemoResultPage />
          </LazyPage>
        ),
      },
      {
        path: "plan/:resultId/:planId",
        element: (
          <LazyPage>
            <PlanDetailPage />
          </LazyPage>
        ),
      },
      {
        path: "*",
        element: (
          <LazyPage>
            <NotFoundPage />
          </LazyPage>
        ),
      },
    ],
  },
]);
