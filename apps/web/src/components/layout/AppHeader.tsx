"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Calendar,
  FileText,
  LayoutGrid,
  ListChecks,
  Megaphone,
  ScanLine,
  Trophy,
  User,
  UserCog,
  Users,
  Users2,
  type LucideIcon,
} from "lucide-react";

import { GradientText } from "@/components/ui/gradient-text";
import { useAuth } from "@/hooks/useAuth";
import { apiGet } from "@/lib/api-client";
import { authApi, type Role } from "@/lib/auth";
import type { Stage } from "@/types/models";

const ROLE_LABEL: Record<Role, string> = { admin: "大會", referee: "裁判" };

type NavChild = {
  href: string;
  label: string;
  description: string;
  icon?: LucideIcon;
};

type NavSection = {
  title?: string;
  items: NavChild[];
};

type NavItem = {
  href: string;
  label: string;
  sections?: NavSection[];
};

function sectionsChildren(item: NavItem): NavChild[] {
  return item.sections?.flatMap((s) => s.items) ?? [];
}

const STATIC_ADMIN_CHILDREN: NavChild[] = [
  {
    href: "/admin/tournament",
    label: "賽事資訊與公告",
    description: "賽事名稱、日期、狀態與大會公告內文。",
    icon: Megaphone,
  },
  {
    href: "/admin/schedule",
    label: "賽程 PDF 管理",
    description: "分組上傳時間表 / 單打 / 團體賽 PDF。",
    icon: FileText,
  },
  {
    href: "/admin/tables",
    label: "球檯管理",
    description: "開賽、結束、裁判指派。",
    icon: LayoutGrid,
  },
  {
    href: "/admin/referees",
    label: "裁判名單",
    description: "建立可被指派的裁判清單。",
    icon: UserCog,
  },
  {
    href: "/admin/teams",
    label: "團賽名單",
    description: "新增、編輯男 / 女團隊伍與隊員資料。",
    icon: Users2,
  },
  {
    href: "/admin/groups",
    label: "循環賽分組",
    description: "建立大組與循環分組供賽果登記與排名使用。",
    icon: Trophy,
  },
  {
    href: "/check-in",
    label: "掃描報到",
    description: "以相機掃描選手學號條碼進行報到。",
    icon: ScanLine,
  },
];

function rosterChild(s: Stage): NavChild {
  const isTeam = s.name.includes("團");
  return {
    href: isTeam ? `/teams/${s.id}` : `/participants/${s.id}`,
    label: s.name,
    description: isTeam ? "隊伍名單" : "選手名單",
    icon: isTeam ? Users2 : s.name.includes("雙") ? Users : User,
  };
}

function scheduleChild(s: Stage): NavChild {
  return {
    href: `/schedule?s=${s.id}`,
    label: s.name,
    description: "賽程 PDF",
    icon: FileText,
  };
}

function buildNavItems(stages: Stage[]): NavItem[] {
  const tournamentSections: NavSection[] = [
    {
      title: "賽程表",
      items: [
        {
          href: "/schedule?s=timetable",
          label: "時間表",
          description: "大會時程表 PDF",
          icon: Calendar,
        },
        ...stages.map(scheduleChild),
      ],
    },
    {
      title: "名單",
      items: stages.map(rosterChild),
    },
  ];

  return [
    { href: "/", label: "首頁 / 公告" },
    { href: "/live", label: "即時監控" },
    { href: "/schedule", label: "賽事", sections: tournamentSections },
    {
      href: "/results",
      label: "賽果",
      sections: [
        {
          items: [
            {
              href: "/results",
              label: "已完成賽果",
              description: "全部完成的單場與團體對抗結果。",
              icon: ListChecks,
            },
            {
              href: "/standings",
              label: "循環排名",
              description: "各大組循環賽的即時排名表。",
              icon: BarChart3,
            },
          ],
        },
      ],
    },
    { href: "/admin", label: "管理後台", sections: [{ items: STATIC_ADMIN_CHILDREN }] },
  ];
}

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  const base = href.split("?")[0];
  return pathname === base || pathname.startsWith(`${base}/`);
}

function isItemActive(pathname: string | null, item: NavItem): boolean {
  if (isActive(pathname, item.href)) return true;
  return sectionsChildren(item).some((c) => isActive(pathname, c.href));
}

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { status, role, refresh } = useAuth();
  const [hovered, setHovered] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [stages, setStages] = useState<Stage[]>([]);

  useEffect(() => {
    apiGet<Stage[]>("/stages")
      .then(setStages)
      .catch(() => setStages([]));
  }, [pathname]);

  const navItems = useMemo(() => buildNavItems(stages), [stages]);

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

  async function handleLogout() {
    await authApi.logout();
    await refresh();
    setMobileOpen(false);
    router.push("/");
  }

  return (
    <header className="animate-header-in sticky top-0 z-20 bg-cream-50/90 backdrop-blur">
      <div className="mx-auto max-w-[1600px] px-6 pb-2 pt-2 md:pb-3 md:pt-3">
        <div onMouseLeave={() => setHovered(null)}>
          <div className="flex items-center justify-between gap-6 px-0 pb-1 pt-3 md:px-6 md:py-3">
            <Link
              href="/"
              className="flex shrink-0 items-center leading-none text-ink"
            >
              <GradientText className="rounded-md px-1 font-sans text-4xl font-bold tracking-tight text-ink md:text-3xl">
                KoRally
              </GradientText>
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

          {/* Mobile menu panel */}
          {mobileOpen ? (
            <nav className="border-t border-cream-200/70 md:hidden">
              <ul>
                {navItems.map((item) => {
                  const active = isItemActive(pathname, item);
                  const base = item.href.split("?")[0];
                  const sections = item.sections ?? [];
                  const hasChildren = sections.some((s) => s.items.length > 0);
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
                        <div className="mb-3 ml-3 mr-3 overflow-hidden rounded-xl border border-cream-200/70 bg-cream-50/60 md:ml-6 md:mr-6">
                          {sections.map((section, si) => (
                            <div key={si} className={si > 0 ? "border-t border-cream-200/70" : ""}>
                              {section.title ? (
                                <div className="px-4 pb-1 pt-2.5 text-[10px] uppercase tracking-[0.2em] text-ink-muted md:px-6">
                                  {section.title}
                                </div>
                              ) : null}
                              <ul>
                                {section.items.map((child) => {
                                  const childActive = isActive(pathname, child.href);
                                  const Icon = child.icon;
                                  return (
                                    <li key={child.href}>
                                      <Link
                                        href={child.href}
                                        onClick={() => setMobileOpen(false)}
                                        className={`flex items-center gap-3 py-2.5 pl-4 pr-4 text-base transition-colors md:pl-6 md:pr-6 ${
                                          childActive ? "font-medium text-ink" : "text-ink-soft"
                                        }`}
                                      >
                                        {Icon ? (
                                          <Icon className="h-4 w-4 shrink-0 text-ink-muted" />
                                        ) : null}
                                        {child.label}
                                      </Link>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          ))}
                        </div>
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
  const sections = item.sections ?? [];
  const hasChildren = sections.some((s) => s.items.length > 0);

  const textClass = active
    ? "text-brand"
    : isHovered
      ? "text-brand"
      : someoneElseHovered
        ? "text-ink-faint"
        : "text-ink-soft";

  return (
    <li className="relative" onMouseEnter={() => onHover(item.href)}>
      <Link
        href={item.href}
        className={`flex items-center gap-1.5 px-2 py-1.5 font-medium transition-colors ${textClass}`}
      >
        <span>{item.label}</span>
        {hasChildren ? <Caret open={isHovered} /> : null}
      </Link>
      {isHovered && hasChildren ? (
        <div className="absolute left-1/2 top-full z-30 mt-3 w-80 -translate-x-1/2 rounded-2xl border border-cream-200 bg-cream-100 p-2 shadow-pop">
          {sections.map((section, si) => (
            <div
              key={si}
              className={si > 0 ? "mt-1 border-t border-cream-200/70 pt-1" : ""}
            >
              {section.title ? (
                <div className="px-3 pb-1 pt-2 text-[10px] uppercase tracking-[0.22em] text-ink-muted">
                  {section.title}
                </div>
              ) : null}
              {section.items.map((child) => {
                const Icon = child.icon;
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    className="flex items-start gap-3 rounded-xl p-3 transition hover:bg-cream-200"
                  >
                    {Icon ? (
                      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-ink-muted" strokeWidth={2} />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-ink">{child.label}</div>
                      {child.description ? (
                        <div className="mt-0.5 text-xs text-ink-muted">{child.description}</div>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      ) : null}
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
  "group relative overflow-hidden rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-cream-50 shadow-sm transition-colors";

function GradientOverlay() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 rounded-xl bg-[linear-gradient(to_right,#fec796,#fb5646,#827acc,#2e79d8)] opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100"
    />
  );
}
