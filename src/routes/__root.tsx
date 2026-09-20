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

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppStateProvider } from "@/state/app-state";
import { AuthProvider } from "@/state/auth-state";
import { AppShell } from "@/components/layout/app-shell";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { activeDomainKey } from "@/domain/active";
import { ACTIVE_PACKAGE } from "@/domain/registry";
import { domainOverride } from "@/lib/active-domain";
import { readSubjectCookie, writeSubjectCookie } from "@/lib/subject-cookie";
import { getRequestSubject } from "@/lib/subject.functions";
import { themeBootScript } from "@/state/theme";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Button asChild>
            <Link to="/">Go home</Link>
          </Button>
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
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button
            onClick={() => {
              router.invalidate();
              reset();
            }}
          >
            Try again
          </Button>
          <Button asChild variant="outline">
            <a href="/">Go home</a>
          </Button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  staticData: { sitemap: false },

  /**
   * Whether this visitor chose a course other than the default one. The server
   * learns it from the cookie the switch writes; the browser reads the same
   * cookie, so both sides agree and the default course is never rendered to
   * someone who is studying something else.
   */
  beforeLoad: async () => {
    const chosen = import.meta.env.SSR ? await getRequestSubject() : readSubjectCookie();
    return { subjectPending: Boolean(chosen) && chosen !== ACTIVE_PACKAGE };
  },


  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "google-site-verification", content: "nVurTzDXdhAsqoE2OM9jB_9wE-KzORrW_IewPklwUus" },

      { title: "IT PATH, Certification-Based IT & Cybersecurity Training" },
      {
        name: "description",
        content:
          "IT PATH is a structured, certification-based study platform taking beginners to professional IT and cybersecurity roles.",
      },
      { property: "og:title", content: "IT PATH" },
      {
        property: "og:description",
        content: "A structured, certification-based path from IT beginner to cybersecurity professional.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#0f1720" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "IT PATH" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Manrope:wght@400;500;600;700&family=Sora:wght@500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap",
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
    ],

  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    // The boot script stamps the theme class and the subject onto this element
    // before paint, so hydration must leave those attributes alone.
    <html
      lang="en"
      className="dark"
      data-subject={activeDomainKey.split("@")[0]}
      suppressHydrationWarning
    >


      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient, subjectPending } = Route.useRouteContext();
  // On a non-default course the page waits one beat for the browser, rather
  // than showing the default course's material and then swapping it out.
  const [ready, setReady] = useState(!subjectPending);

  useEffect(() => {
    // Keep the cookie in step with a choice made before the cookie existed.
    const stored = domainOverride();
    const cookie = readSubjectCookie();
    const wanted = stored && stored !== ACTIVE_PACKAGE ? stored : null;
    if (wanted !== cookie) writeSubjectCookie(wanted);
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Loading your course…</p>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppStateProvider>
          <PaymentTestModeBanner />
          <AppShell>
            {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
            <Outlet />
          </AppShell>
          <Toaster />
        </AppStateProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
