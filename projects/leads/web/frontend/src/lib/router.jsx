import { createContext, useContext, useEffect, useState } from 'react';

const RouterContext = createContext({ path: '/', navigate: () => {} });

export function RouterProvider({ children }) {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const navigate = (to) => {
    if (to === window.location.pathname + window.location.search) return;
    window.history.pushState({}, '', to);
    setPath(new URL(to, window.location.origin).pathname);
    window.scrollTo(0, 0);
    // Move focus to the main landmark so screen-reader users land on the new view.
    requestAnimationFrame(() => document.getElementById('main')?.focus());
  };
  return <RouterContext.Provider value={{ path, navigate }}>{children}</RouterContext.Provider>;
}

export const useRouter = () => useContext(RouterContext);

export function Link({ to, children, ...rest }) {
  const { navigate, path } = useRouter();
  const onClick = (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(to);
  };
  const current = path === new URL(to, window.location.origin).pathname;
  return (
    <a href={to} onClick={onClick} aria-current={current ? 'page' : undefined} {...rest}>
      {children}
    </a>
  );
}
