import './styles/global.css';
import { AuthProvider } from './hooks/useAuth.jsx';
import { AccountProvider } from './hooks/useAccount.jsx';
import { RouterProvider, useRouter } from './lib/router.jsx';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import SearchPage from './pages/SearchPage.jsx';
import SavedPage from './pages/SavedPage.jsx';
import AccountPage from './pages/AccountPage.jsx';
import SignInPage from './pages/SignInPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

const ROUTES = {
  '/': SearchPage,
  '/saved': SavedPage,
  '/account': AccountPage,
  '/signin': SignInPage,
};

function Shell() {
  const { path } = useRouter();
  const Page = ROUTES[path.replace(/\/+$/, '') || '/'] || NotFoundPage;
  return (
    <>
      <a className="skip-link" href="#main">Skip to main content</a>
      <Header />
      <main id="main" tabIndex={-1}>
        <Page />
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AccountProvider>
        <RouterProvider>
          <Shell />
        </RouterProvider>
      </AccountProvider>
    </AuthProvider>
  );
}
