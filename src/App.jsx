import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import AuthPage from '@/pages/AuthPage';
import LabelDashboard from '@/pages/LabelDashboard';
import LabelManagement from '@/pages/LabelManagement';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isAuthenticated } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking auth
  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-zinc-700 border-t-zinc-200 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Nothing is reachable without an account — bounce anonymous visitors
  // straight to login/register.
  if (!isAuthenticated && location.pathname !== '/AuthPage') {
    return <Navigate to="/AuthPage" replace />;
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/LabelDashboard" element={
        <LayoutWrapper currentPageName="LabelDashboard">
          <LabelDashboard />
        </LayoutWrapper>
      } />
      <Route path="/LabelManagement" element={
        <LayoutWrapper currentPageName="LabelManagement">
          <LabelManagement />
        </LayoutWrapper>
      } />
      <Route path="/AuthPage" element={<AuthPage />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App