"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { authApi, type Role } from "@/lib/auth";
import { SCHEDULE_CATEGORIES } from "@/types/models";

const ROLE_LABEL: Record<Role, string> = { admin: "大會", referee: "裁判" };

type NavChild = {
  href: string;
  label: string;
  description: string;
};

type NavItem = {
  href: string;
  label: string;
  children?: NavChild[];
};

const navItems: NavItem[] = [
  { href: "/", label: "首頁 / 公告" },
  { href: "/live", label: "即時監控" },
  {
    href: "/schedule",
    label: "賽程表",
    children: SCHEDULE_CATEGORIES.map((cat) => ({
      href: `/schedule?c=${encodeURIComponent(cat)}`,
      label: cat,
      description: "",
    })),
  },
  {
    href: "/participants",
    label: "參賽名單",
    children: [
      { href: "/participants/men_singles", label: "公開男單", description: "" },
      { href: "/participants/women_singles", label: "公開女單", description: "" },
      { href: "/participants/doubles", label: "歡樂雙打", description: "" },
      { href: "/teams/men", label: "公開男團", description: "" },
      { href: "/teams/women", label: "公開女團", description: "" },
    ],
  },
  { href: "/results", label: "賽果" },
  {
    href: "/admin",
    label: "管理後台",
    children: [
      {
        href: "/admin/tournament",
        label: "賽事資訊與公告",
        description: "賽事名稱、日期、狀態與大會公告內文。",
      },
      {
        href: "/admin/schedule",
        label: "賽程 PDF 管理",
        description: "分組上傳時間表 / 單打 / 團體賽 PDF。",
      },
      {
        href: "/admin/tables",
        label: "球檯管理",
        description: "開賽、結束、裁判指派。",
      },
      {
        href: "/admin/teams",
        label: "團賽名單",
        description: "新增、編輯男 / 女團隊伍與隊員資料。",
      },
      {
        href: "/admin/main-desk",
        label: "大會桌管理",
        description: "名稱、狀態、目前輪班。",
      },
    ],
  },
];

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  const base = href.split("?")[0];
  return pathname === base || pathname.startsWith(`${base}/`);
}

function isItemActive(pathname: string | null, item: NavItem): boolean {
  if (isActive(pathname, item.href)) return true;
  return item.children?.some((c) => isActive(pathname, c.href)) ?? false;
}

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { status, role, refresh } = useAuth();
  const [hovered, setHovered] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function toggleExpanded(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const hoveredItem = hovered ? navItems.find((i) => i.href === hovered) : null;
  const hoveredHasChildren = !!hoveredItem?.children?.length;
  const isCompactDropdown = hoveredHasChildren && hoveredItem!.children!.every((c) => !c.description);

  async function handleLogout() {
    await authApi.logout();
    await refresh();
    setMobileOpen(false);
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-20 md:bg-cream-50/90 md:backdrop-blur">
      <div className="mx-auto max-w-[1600px] px-6 pb-2 pt-2 md:pb-3 md:pt-3">
        <div
          className="md:overflow-hidden md:rounded-2xl md:border md:border-cream-200 md:bg-white md:shadow-card"
          onMouseLeave={() => setHovered(null)}
        >
          <div className="flex items-center justify-between gap-6 px-0 pb-1 pt-3 md:px-6 md:py-3">
            <Link
              href="/"
              className="flex shrink-0 items-center gap-3 leading-none text-ink"
            >
              <Image
                src="/image.png"
                alt="NTUTTST"
                width={44}
                height={44}
                className="h-11 w-11 rounded-md md:h-10 md:w-10"
                priority
              />
              <span className="font-sans text-4xl font-bold tracking-tight md:text-3xl">conistem</span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden flex-1 justify-center md:flex">
              <ul className="flex items-center gap-5 text-base">
                {navItems.map((item) => (
                  <DesktopNavItem
                    key={item.href}
                    item={item}
                    active={isItemActive(pathname, item)}
                    hovered={hovered}
                    onHover={setHovered}
                  />
                ))}
              </ul>
            </nav>

            {/* Desktop auth */}
            <div className="hidden shrink-0 items-center gap-3 md:flex">
              {status === "loading" ? (
                <span className="text-sm text-ink-faint">⋯</span>
              ) : status === "authenticated" ? (
                <>
                  {role ? <RoleBadge role={role} /> : null}
                  <button onClick={handleLogout} className={AUTH_BUTTON_CLASS}>
                    <GradientOverlay />
                    <span className="relative">登出</span>
                  </button>
                </>
              ) : pathname === "/login" ? null : (
                <Link
                  href={`/login?redirect=${encodeURIComponent(pathname ?? "/admin")}`}
                  className={AUTH_BUTTON_CLASS}
                >
                  <GradientOverlay />
                  <span className="relative">管理員登入</span>
                </Link>
              )}
            </div>

            {/* Mobile hamburger / close */}
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "關閉選單" : "打開選單"}
              className="rounded-xl border border-ink/10 bg-cream-50/60 p-3 text-ink backdrop-blur-sm hover:bg-cream-50/80 md:hidden"
            >
              {mobileOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>

          {/* Desktop dropdown panel */}
          {hoveredHasChildren ? (
            <div className="hidden border-t border-cream-200/70 bg-cream-50/40 md:block">
              {isCompactDropdown ? (
                <div className="grid gap-2 px-6 py-5 sm:grid-cols-3">
                  {hoveredItem!.children!.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-ink transition hover:bg-cream-100"
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="grid gap-3 px-6 py-5 sm:grid-cols-2 lg:grid-cols-4">
                  {hoveredItem!.children!.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className="rounded-xl px-3 py-2 transition hover:bg-white"
                    >
                      <div className="text-sm font-medium text-ink">{child.label}</div>
                      {child.description ? (
                        <div className="mt-0.5 text-xs text-ink-muted">{child.description}</div>
                      ) : null}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {/* Mobile menu panel */}
          {mobileOpen ? (
            <nav className="border-t border-cream-200/70 md:hidden">
              <ul>
                {navItems.map((item) => {
                  const active = isItemActive(pathname, item);
                  const base = item.href.split("?")[0];
                  const hasChildren = !!item.children?.length;
                  const isOpen = expanded.has(item.href);
                  return (
                    <li key={item.href} className="border-b border-cream-200/70 last:border-b-0">
                      <div className="flex items-center justify-between gap-2 px-0 md:px-6">
                        <Link
                          href={base}
                          onClick={() => setMobileOpen(false)}
                          className={`flex-1 py-4 text-lg transition-colors ${
                            active ? "text-ink" : "text-ink-soft"
                          }`}
                        >
                          <span className={active ? "font-semibold" : ""}>{item.label}</span>
                        </Link>
                        {hasChildren ? (
                          <button
                            type="button"
                            onClick={() => toggleExpanded(item.href)}
                            aria-label={isOpen ? "收合子選單" : "展開子選單"}
                            aria-expanded={isOpen}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-cream-100"
                          >
                            <Caret open={isOpen} />
                          </button>
                        ) : null}
                      </div>
                      {hasChildren && isOpen ? (
                        <ul className="border-t border-cream-200/50 bg-cream-50/50">
                          {item.children!.map((child) => {
                            const childActive = isActive(pathname, child.href);
                            return (
                              <li key={child.href}>
                                <Link
                                  href={child.href}
                                  onClick={() => setMobileOpen(false)}
                                  className={`block py-2.5 pl-5 pr-0 text-base transition-colors md:pl-10 md:pr-6 ${
                                    childActive
                                      ? "font-medium text-ink"
                                      : "text-ink-soft"
                                  }`}
                                >
                                  {child.label}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
              <div className="px-0 py-5 md:px-6">
                {status === "loading" ? (
                  <div className="py-3 text-center text-sm text-ink-faint">⋯</div>
                ) : status === "authenticated" ? (
                  <>
                    {role ? (
                      <div className="mb-3 flex justify-center">
                        <RoleBadge role={role} />
                      </div>
                    ) : null}
                    <button
                      onClick={handleLogout}
                      className={`${AUTH_BUTTON_CLASS} block w-full text-center`}
                    >
                      <GradientOverlay />
                      <span className="relative">登出</span>
                    </button>
                  </>
                ) : pathname === "/login" ? null : (
                  <Link
                    href={`/login?redirect=${encodeURIComponent(pathname ?? "/admin")}`}
                    onClick={() => setMobileOpen(false)}
                    className={`${AUTH_BUTTON_CLASS} block w-full text-center`}
                  >
                    <GradientOverlay />
                    <span className="relative">管理員登入</span>
                  </Link>
                )}
              </div>
            </nav>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function DesktopNavItem({
  item,
  active,
  hovered,
  onHover,
}: {
  item: NavItem;
  active: boolean;
  hovered: string | null;
  onHover: (href: string | null) => void;
}) {
  const isHovered = hovered === item.href;
  const someoneElseHovered = hovered !== null && hovered !== item.href;
  const hasChildren = !!item.children?.length;

  const textClass = isHovered
    ? "text-ink"
    : someoneElseHovered
      ? "text-ink-faint"
      : active
        ? "text-ink"
        : "text-ink-soft";

  return (
    <li className="relative" onMouseEnter={() => onHover(item.href)}>
      <Link
        href={item.href}
        className={`relative flex items-center gap-1.5 px-2 py-1.5 font-medium transition-colors ${textClass}`}
      >
        <span>{item.label}</span>
        {hasChildren ? <Caret open={isHovered} /> : null}
        {isHovered && !hasChildren ? (
          <span className="absolute inset-x-2 -bottom-0.5 h-px bg-ink" />
        ) : null}
        {active && !isHovered && !someoneElseHovered ? (
          <span className="absolute left-1/2 -bottom-1 h-1 w-1 -translate-x-1/2 rounded-full bg-ink" />
        ) : null}
      </Link>
    </li>
  );
}

function Caret({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden
      className={`h-2.5 w-2.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 4.5 6 7.5 9 4.5" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden
      className="h-7 w-7"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <line x1="3" y1="6" x2="17" y2="6" />
      <line x1="3" y1="10" x2="17" y2="10" />
      <line x1="3" y1="14" x2="13" y2="14" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden
      className="h-7 w-7"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <line x1="5" y1="5" x2="15" y2="15" />
      <line x1="15" y1="5" x2="5" y2="15" />
    </svg>
  );
}

function RoleBadge({ role }: { role: Role }) {
  const tone =
    role === "admin"
      ? "bg-accent-butter/50 text-ink"
      : "bg-cream-100 text-ink-soft";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
      {ROLE_LABEL[role]}
    </span>
  );
}

const AUTH_BUTTON_CLASS =
  "group relative overflow-hidden rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors";

function GradientOverlay() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 rounded-xl bg-[linear-gradient(to_right,#fec796,#fb5646,#827acc,#2e79d8)] opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100"
    />
  );
}
