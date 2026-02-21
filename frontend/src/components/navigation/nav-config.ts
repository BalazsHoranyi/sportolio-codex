export type AppNavItem = {
  id: "today" | "calendar" | "planner" | "analytics" | "settings";
  label: string;
  href: string;
};

export const APP_NAV_ITEMS: AppNavItem[] = [
  {
    id: "today",
    label: "Today",
    href: "/today",
  },
  {
    id: "calendar",
    label: "Calendar",
    href: "/calendar",
  },
  {
    id: "planner",
    label: "Planner",
    href: "/planner",
  },
  {
    id: "analytics",
    label: "Analytics",
    href: "/analytics",
  },
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
  },
];
