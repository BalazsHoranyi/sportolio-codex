import HomePage, { dynamic } from "../page";
import {
  normalizeSessionId,
  resolveCalendarSessionFocus,
} from "../../features/today/session-focus";

type SearchParams = {
  sessionId?: string | string[];
};

interface CalendarPageProps {
  searchParams?: Promise<SearchParams>;
}

export { dynamic };

export default async function CalendarPage({
  searchParams,
}: CalendarPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const sessionId = normalizeSessionId(resolvedSearchParams?.sessionId);
  const sessionFocus = sessionId
    ? resolveCalendarSessionFocus(sessionId)
    : undefined;

  return HomePage({ sessionFocus });
}
