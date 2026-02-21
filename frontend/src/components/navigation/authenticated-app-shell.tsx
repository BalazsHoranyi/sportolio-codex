import React, { type ReactNode } from "react";
import Link from "next/link";

import { APP_NAV_ITEMS, type AppNavItem } from "./nav-config";

interface AuthenticatedAppShellProps {
  activeItem: AppNavItem["id"];
  title: string;
  description: string;
  children: ReactNode;
  accentLabel?: string;
}

function renderNavLink(item: AppNavItem, activeItem: AppNavItem["id"]) {
  const isActive = item.id === activeItem;
  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      className={
        isActive ? "app-shell-nav-link is-active" : "app-shell-nav-link"
      }
      href={item.href}
      key={item.id}
    >
      {item.label}
    </Link>
  );
}

export function AuthenticatedAppShell({
  activeItem,
  title,
  description,
  children,
  accentLabel = "Sportolo",
}: AuthenticatedAppShellProps) {
  return (
    <>
      <a className="app-shell-skip-link" href="#app-main-content">
        Skip to main content
      </a>
      <div className="app-shell">
        <header className="app-shell-topbar">
          <div className="app-shell-brand-row">
            <Link className="app-shell-brand" href="/today">
              Sportolo
            </Link>
            <p className="app-shell-brand-copy">Hybrid training platform</p>
          </div>

          <nav aria-label="Primary" className="app-shell-nav-desktop">
            {APP_NAV_ITEMS.map((item) => renderNavLink(item, activeItem))}
          </nav>

          <div className="app-shell-utility-desktop">
            <p
              className="app-shell-session-pill"
              role="status"
              aria-live="polite"
            >
              Authenticated session active
            </p>
            <form action="/api/auth/logout?redirect=/login" method="post">
              <button className="button button-secondary" type="submit">
                Logout
              </button>
            </form>
          </div>

          <details className="app-shell-mobile-menu">
            <summary className="app-shell-mobile-trigger">Menu</summary>
            <div className="app-shell-mobile-panel">
              <nav
                aria-label="Mobile primary"
                className="app-shell-mobile-links"
              >
                {APP_NAV_ITEMS.map((item) => renderNavLink(item, activeItem))}
              </nav>
              <form action="/api/auth/logout?redirect=/login" method="post">
                <button
                  className="button button-secondary app-shell-mobile-logout"
                  type="submit"
                >
                  Logout
                </button>
              </form>
            </div>
          </details>
        </header>

        <main className="app-shell-main" id="app-main-content">
          <section className="app-page-intro" aria-labelledby="app-page-title">
            <p className="eyebrow">{accentLabel}</p>
            <h1 id="app-page-title">{title}</h1>
            <p className="app-page-intro-copy">{description}</p>
          </section>

          {children}
        </main>
      </div>
    </>
  );
}
