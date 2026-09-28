// @ts-nocheck
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { StoreProvider, useStore } from "../context/StoreContext";
import { Sidebar } from "../components/Sidebar";
import { NotificationManager } from "../components/NotificationManager";
import { LicenseProvider } from "../context/LicenseContext";
import { LicenseGuard } from "../components/LicenseGuard";
import { Menu } from "lucide-react";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { hydrateLocalDb } from "../lib/local-db";
import { startAutoFolderBackup, restoreFromFolderOnBoot } from "../lib/folder-backup";
import { registerOfflineSupport } from "../lib/pwa";
import appCss from "../styles.css?url";
const smartpdvLogoAsset = { url: "/previews/smartpdv-logo.png" };

function SplashScreen() {
  const { settings } = useStore();
  const defaultLogoUrl = smartpdvLogoAsset.url;

  const logoUrl = settings?.splashLogo || settings?.logo || defaultLogoUrl;



  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center animate-fade-in">
      <div className="relative flex items-center justify-center">
        <div className="absolute w-72 h-72 bg-blue-100 rounded-full animate-ping opacity-20"></div>
        <div className="w-72 h-72 md:w-88 md:h-88 relative z-10 flex items-center justify-center p-4">

          <img
            src={logoUrl}
            alt="Logo"
            className="w-full h-full object-contain animate-pulse drop-shadow-xl"
            onError={(e) => {
              if (e.currentTarget.src !== defaultLogoUrl) {
                e.currentTarget.src = defaultLogoUrl;
              } else {
                e.currentTarget.style.display = "none";
              }
            }}
          />
        </div>
      </div>
      <div className="mt-8 flex flex-col items-center gap-2">
        <h2 className="text-2xl font-bold text-slate-800 tracking-widest uppercase">
          {settings?.name || "Smart PDV PRO"}
        </h2>
        <div className="flex gap-1">
          <div
            className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
            style={{ animationDelay: "0s" }}
          ></div>
          <div
            className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
            style={{ animationDelay: "0.1s" }}
          ></div>
          <div
            className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
            style={{ animationDelay: "0.2s" }}
          ></div>
        </div>
      </div>
    </div>
  );
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          Page not found
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back
          home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Smart PDV PRO" },
      { name: "description", content: "Gestão Inteligente & Segura" },
      { property: "og:title", content: "Smart PDV PRO" },
      { property: "og:description", content: "Gestão Inteligente & Segura" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AppLayout({ children }: { children: ReactNode }) {
  const { currentUser, isAdmin, isFreeVersion } = useStore();
  const router = useRouter();
  const location = router.state.location;
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(() => {
    // Apenas mostra o splash na primeira carga (quando o módulo é inicializado no cliente)
    if (typeof window !== 'undefined') {
      const hasShownSplash = window.sessionStorage.getItem('hasShownSplash');
      return !hasShownSplash;
    }
    return true;
  });

  const isPublicRoute = 
    location.pathname === "/" || 
    location.pathname === "/login" || 
    location.pathname === "/register" || 
    location.pathname === "/register-store-owner" ||
    location.pathname === "/vitrine" ||
    location.pathname === "/autologin" ||
    location.pathname === "/vitrine-settings" ||
    location.pathname.startsWith("/l/") || 
    location.pathname.endsWith("/vitrine") || // Vitrine de lojas
    location.pathname.match(/\/[^/]+\/login/) || 
    location.pathname.includes("/login") ||
    location.pathname.includes("/register") ||
    location.pathname.includes("/cadastro");

  useEffect(() => {
    // Se o splash já foi exibido nesta sessão, não faz nada
    if (!showSplash) return;

    // Se estiver em uma rota pública (exceto home), não mostramos splash
    if (isPublicRoute && location.pathname !== "/" && location.pathname !== "/vitrine") {
      setShowSplash(false);
      window.sessionStorage.setItem('hasShownSplash', 'true');
      return;
    }

    const timer = setTimeout(() => {
      setShowSplash(false);
      window.sessionStorage.setItem('hasShownSplash', 'true');
    }, 2000);
    return () => clearTimeout(timer);
  }, [location.pathname, isPublicRoute, showSplash]);

  useEffect(() => {
    // Redirecionamento automático se já estiver logado
    if (location.pathname === "/login" && currentUser) {
      if (currentUser?.role === 'AdminGeral') {
        router.navigate({ to: '/dashboard' });
      } else if (currentUser?.role === 'DonoLoja') {
        // Redirecionamento para o slug da loja será tratado pelo StoreContext.login
        // mas aqui fazemos um fallback seguro se chegar aqui logado
        router.navigate({ to: '/dashboard' });
      } else if (currentUser?.role === 'Cliente' && currentUser.tenantId) {
        // Redirecionamento para a vitrine
        router.navigate({ to: `/l/${currentUser.tenantId}` });
      }
    }

  }, [location.pathname, currentUser, router, showSplash]);

  if (showSplash) {
    return <SplashScreen />;
  }


  if (isPublicRoute) {
    return (
      <>
        <NotificationManager />
        {children}
      </>
    );
  }


  if (!currentUser || currentUser.id === "guest_user") {
    // Already handled by isPublicRoute for index
    return (
      <>
        <NotificationManager />
        {children}
      </>
    );
  }


  return (
    <div className="flex h-screen bg-slate-900 font-sans text-slate-100 overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <main className="flex-1 flex flex-col h-full w-full overflow-hidden relative bg-slate-50 text-slate-900">
        <div className="md:hidden bg-white p-4 flex items-center gap-4 border-b border-slate-200 shrink-0 text-slate-900">

          <button
            onClick={() => setIsSidebarOpen(true)}
            className="text-slate-700 p-1 hover:bg-slate-100 rounded"
          >
            <Menu size={24} />
          </button>
          <span className="font-bold text-slate-800 text-lg">Smart PDV PRO</span>
        </div>
        <div className="flex-1 overflow-auto flex flex-col">
          <>
            <NotificationManager />
            <LicenseGuard>{children}</LicenseGuard>

          </>
        </div>
        
      </main>
    </div>
  );
}

function LocalDbGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    hydrateLocalDb()
      .then(() => restoreFromFolderOnBoot())
      .finally(() => {
        if (active) setReady(true);
      });
    registerOfflineSupport();
    startAutoFolderBackup();
    return () => {
      active = false;
    };
  }, []);

  if (!ready) {
    return (
      <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center gap-4">
        <img
          src={smartpdvLogoAsset.url}
          alt="Smart PDV PRO"
          className="w-48 h-48 object-contain animate-pulse"
        />
        <p className="text-sm text-slate-500">Carregando seus dados...</p>
      </div>
    );
  }

  return <>{children}</>;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <LocalDbGate>
      <StoreProvider>
        <LicenseProvider>
          <AppLayout>
            <Outlet />
          </AppLayout>
        </LicenseProvider>
      </StoreProvider>
      </LocalDbGate>
    </QueryClientProvider>
  );
}
