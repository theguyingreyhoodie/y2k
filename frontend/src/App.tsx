import { Link, Outlet, ScrollRestoration, createBrowserRouter } from "react-router";
import { Toaster } from "sonner";
import { Navbar } from "@/components/Navbar";
import { RequireAuth } from "@/components/RequireAuth";
import { Window } from "@/components/Window";
import { useTheme } from "@/lib/theme";
import { ForgotPassword, Login, Register, ResetPassword } from "@/pages/Auth";
import Editor from "@/pages/Editor";
import Gallery from "@/pages/Gallery";
import Landing from "@/pages/Landing";
import ShareView from "@/pages/ShareView";

function Shell() {
  const { theme } = useTheme();
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Navbar />
      <Outlet />
      <ScrollRestoration />
      <Toaster
        theme={theme}
        position="bottom-center"
        toastOptions={{ classNames: { toast: "toast", title: "toast__title", description: "toast__desc", actionButton: "toast__action" } }}
      />
    </>
  );
}

function NotFound() {
  return (
    <main className="page share share--missing" id="main">
      <Window title="404.exe" className="share__window" bodyClassName="share__missing">
        <img src="/stickers/error_window.svg" alt="" width={220} />
        <h1>Page not found.</h1>
        <p>That link went somewhere that doesn't exist.</p>
        <Link to="/" className="btn">
          Back home
        </Link>
      </Window>
    </main>
  );
}

export const router = createBrowserRouter([
  {
    element: <Shell />,
    children: [
      { path: "/", element: <Landing /> },
      { path: "/login", element: <Login /> },
      { path: "/register", element: <Register /> },
      { path: "/forgot-password", element: <ForgotPassword /> },
      { path: "/reset-password", element: <ResetPassword /> },
      { path: "/share/:slug", element: <ShareView /> },
      {
        path: "/editor",
        element: (
          <RequireAuth>
            <Editor />
          </RequireAuth>
        ),
      },
      {
        path: "/gallery",
        element: (
          <RequireAuth>
            <Gallery />
          </RequireAuth>
        ),
      },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
