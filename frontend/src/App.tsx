import "./App.css";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";

const RESOURCES = [
  {
    label: "MDN: Date",
    url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date",
  },
  {
    label: "MDN: new Date() parameters",
    url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/Date#parameters",
  },
  {
    label: "MDN: Date.now()",
    url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now",
  },
  {
    label: "MDN: Date.parse()",
    url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse",
  },
];

type ExchangeCase = {
  label: string;
  when: ReactNode;
  clientPayload: ReactNode;
  backendStorage: ReactNode;
  sendBack: ReactNode;
};

const EXCHANGE_CASES: ExchangeCase[] = [
  {
    label: "Instant-in-time (timestamp)",
    when: "You care about the exact moment (e.g., audit log, scheduled reminders).",
    clientPayload: (
      <>
        Send an ISO 8601 timestamp with timezone, e.g.{" "}
        <code>new Date(selected).toISOString()</code>.
      </>
    ),
    backendStorage: (
      <>
        Store as UTC (<code>TIMESTAMP WITH TIME ZONE</code>, ISO string, or epoch
        milliseconds). Never store local wall time.
      </>
    ),
    sendBack: (
      <>
        Return ISO strings or milliseconds. Include timezone information so
        clients can render correctly.
      </>
    ),
  },
  {
    label: "Date-only (calendar day)",
    when: "Birthdays, check-in dates, due dates where the time is irrelevant.",
    clientPayload: (
      <>
        Send the raw <code>YYYY-MM-DD</code> string from{" "}
        <code>&lt;input type="date"&gt;</code> without converting to{" "}
        <code>Date</code>.
      </>
    ),
    backendStorage: (
      <>
        Store as a date column or the same string. Only convert to <code>Date</code> when
        you need to display in a specific timezone.
      </>
    ),
    sendBack: (
      <>
        Return the plain string. Let the client format it (localize with{" "}
        <code>Intl.DateTimeFormat</code>).
      </>
    ),
  },
  {
    label: "Month-only",
    when: "Budgeting or reporting periods (month granularity).",
    clientPayload: (
      <>
        Send <code>YYYY-MM</code> strings from{" "}
        <code>&lt;input type="month"&gt;</code>. Include the day if your backend
        needs a concrete date.
      </>
    ),
    backendStorage: (
      <>
        Persist a <code>YEAR_MONTH</code> field or normalize to the first day of
        the month at UTC midnight.
      </>
    ),
    sendBack: (
      <>
        Mirror the <code>YYYY-MM</code> value. Document any normalization rules
        you apply.
      </>
    ),
  },
  {
    label: "Time of day (recurring)",
    when: "Daily schedules (e.g., 09:30 meeting) that repeat regardless of timezone.",
    clientPayload: (
      <>
        Send the literal <code>HH:mm</code> from{" "}
        <code>&lt;input type="time"&gt;</code>. Do not coerce into a timestamp
        unless you apply a timezone.
      </>
    ),
    backendStorage: (
      <>
        Store as separate <code>hour</code>/<code>minute</code> fields or a{" "}
        <code>HH:mm</code> string. Combine with user timezone when you need an
        instant.
      </>
    ),
    sendBack: (
      <>
        Return the <code>HH:mm</code> so the client can render in its locale or
        compose with a timezone as needed.
      </>
    ),
  },
  {
    label: "Year-only",
    when: "Filters or metadata where only the year matters.",
    clientPayload: (
      <>
        Send the literal year string/number (e.g., <code>"2024"</code>).
      </>
    ),
    backendStorage: (
      <>
        Persist as an integer column or string. Avoid manufacturing a full date.
      </>
    ),
    sendBack: (
      <>Return the same primitive to avoid implying a specific day.</>
    ),
  },
];

const COMMON_MISTAKES: ReactNode[] = [
  <>
    Parsing <code>YYYY-MM-DD</code> with <code>new Date()</code> creates a UTC
    midnight instant. When you format it locally it may show the previous day if
    you are behind UTC.
  </>,
  <>
    Using <code>Date.parse()</code> on non-standard strings (e.g.,{" "}
    <code>09-10-2024</code>) is implementation-dependent. Always use ISO 8601 or
    pass explicit parameters to <code>new Date(year, monthIndex, day, ...)</code>.
  </>,
  <>
    Sending locale-formatted strings (<code>10/09/2024 3:00 PM</code>) to an API.
    The backend cannot reliably parse them.
  </>,
  <>
    Storing local time in the database without the originating timezone. You cannot
    reconstruct the original instant later.
  </>,
  <>
    Mutating the same <code>Date</code> instance across layers. Always create a
    new <code>Date</code> when you adjust offsets to avoid accidental shared state.
  </>,
];

type PitfallExample = {
  title: string;
  badCode: string;
  badNote: string;
  fixCode: string;
  fixNote: ReactNode;
};

const PITFALL_EXAMPLES: PitfallExample[] = [
  {
    title: "Parsing YYYY-MM-DD with new Date() shifts a day",
    badCode: `const birthday = new Date("1990-06-01");
console.log(birthday.toISOString()); // 1990-05-31T15:00:00.000Z in UTC-9`,
    badNote:
      "The constructor treats the string as UTC midnight. In negative offsets it renders as the previous calendar day.",
    fixCode: `const birthdayLiteral = "1990-06-01"; // keep as string for storage
const birthdayUtc = new Date(Date.UTC(1990, 5, 1)); // if you truly need an instant`,
    fixNote: (
      <>
        Send <code>YYYY-MM-DD</code> to your backend or build UTC explicitly with{" "}
        <code>Date.UTC</code> when you need an instant.
      </>
    ),
  },
  {
    title: "Parsing locale-formatted strings fails on the server",
    badCode: `// Client submits:
fetch("/api/appointments", {
  method: "POST",
  body: JSON.stringify({ startsAt: "09/10/2024 15:00" }),
});

// Node server:
const startsAt = new Date(req.body.startsAt); // NaN or different day`,
    badNote:
      "Browsers and runtimes disagree on how to interpret locale-specific strings, leading to NaN or mixed-up dates.",
    fixCode: `const startsAtIso = new Date(selectedDate).toISOString();
// or construct from parts:
const startsAtLocal = new Date(year, monthIndex, day, hour, minute);`,
    fixNote: (
      <>
        Always transmit ISO 8601 or individual fields. Avoid relying on{" "}
        <code>Date.parse</code> for non-ISO strings.
      </>
    ),
  },
  {
    title: "Mixing getDate() with UTC strings surprises you",
    badCode: `const meetingUtc = new Date("2024-06-01T00:00:00Z");
console.log(meetingUtc.getDate());    // 31 in the Americas
console.log(meetingUtc.getHours());   // 17 (minus your offset)

// Later you add 1 day expecting June 2nd
meetingUtc.setDate(meetingUtc.getDate() + 1);`,
    badNote:
      "getDate(), getMonth(), etc. read the *local* calendar fields. When the source timestamp is UTC, your offset changes the apparent day.",
    fixCode: `const meetingUtc = new Date("2024-06-01T00:00:00Z");
console.log(meetingUtc.getUTCDate()); // 1

const nextDay = new Date(meetingUtc);
nextDay.setUTCDate(nextDay.getUTCDate() + 1);`,
    fixNote: (
      <>
        Use the <code>getUTC*</code> and <code>setUTC*</code> family when you must
        manipulate UTC instants, or normalize to local time intentionally with{" "}
        <code>getDate()</code> + <code>setDate()</code>.
      </>
    ),
  },
  {
    title: "Mutating a shared Date changes every reference",
    badCode: `const booking = { startsAt: new Date() };
const reminder = booking.startsAt;

booking.startsAt.setHours(booking.startsAt.getHours() + 2);

console.log(reminder.getHours()); // also moved!`,
    badNote:
      "Dates are mutable objects. Sharing the same instance across state or layers causes hidden mutations.",
    fixCode: `const booking = { startsAt: new Date() };
const reminder = new Date(booking.startsAt.getTime()); // clone

booking.startsAt = new Date(booking.startsAt.getTime() + 2 * 60 * 60 * 1000);`,
    fixNote: (
      <>
        Use <code>new Date(original.getTime())</code> or <code>structuredClone</code>{" "}
        to copy before mutating.
      </>
    ),
  },
];

type Scenario = {
  title: string;
  intent: ReactNode;
  client: string;
  server: string;
  storage: ReactNode;
  response: string;
};

const SCENARIO_PLAYBOOK: Scenario[] = [
  {
    title: "Instant in time (timezone aware)",
    intent: (
      <>
        Use when you care about the exact moment an event happens (reminders, audit
        logs, video calls).
      </>
    ),
    client: `const payload = {
  startsAt: new Date(formValues.startsAt).toISOString(),
  submittedAtMs: Date.now(),
};

await fetch("/api/events", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});`,
    server: `const { startsAt, submittedAtMs } = req.body;

const startsAtDate = new Date(startsAt);
const submittedAtDate = new Date(submittedAtMs);

if (Number.isNaN(startsAtDate.getTime())) {
  return res.status(400).json({ error: "startsAt must be ISO-8601" });
}

await db.event.create({
  data: {
    starts_at_iso: startsAtDate.toISOString(),
    submitted_at_epoch_ms: submittedAtDate.getTime(),
  },
});`,
    storage: (
      <>
        Persist UTC instants (<code>TIMESTAMP WITH TIME ZONE</code>,
        ISO string, or epoch milliseconds). Avoid local wall times.
      </>
    ),
    response: `{
  "startsAt": "2024-06-01T09:30:00.000Z",
  "submittedAtMs": 1729872000000
}`,
  },
  {
    title: "Date-only (calendar day)",
    intent: (
      <>
        Use when only the calendar day matters (check-in dates, birthdays, due dates).
      </>
    ),
    client: `const payload = {
  checkInDate: formValues.dateString, // "2024-06-01"
};

await fetch("/api/check-ins", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});`,
    server: `const { checkInDate } = req.body;

if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(checkInDate)) {
  return res.status(400).json({ error: "checkInDate must be YYYY-MM-DD" });
}

await db.checkIn.create({
  data: {
    check_in_date: checkInDate, // DATE column or string
  },
});`,
    storage: (
      <>
        Store the literal <code>YYYY-MM-DD</code>. Convert to UTC only when needed,
        using the user&apos;s timezone.
      </>
    ),
    response: `{
  "checkInDate": "2024-06-01"
}`,
  },
  {
    title: "Month-only (reporting periods)",
    intent: (
      <>
        Use for budgeting windows and summaries where you only care about the month.
      </>
    ),
    client: `const payload = {
  reportingMonth: formValues.monthString, // "2024-06"
};

await fetch("/api/reports", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});`,
    server: `const { reportingMonth } = req.body;

if (!/^\\d{4}-\\d{2}$/.test(reportingMonth)) {
  return res.status(400).json({ error: "reportingMonth must be YYYY-MM" });
}

await db.report.create({
  data: {
    period_year: Number(reportingMonth.slice(0, 4)),
    period_month: Number(reportingMonth.slice(5, 7)),
  },
});`,
    storage: (
      <>
        Persist as separate <code>year</code> / <code>month</code> fields or normalize
        to the first of the month at UTC midnight.
      </>
    ),
    response: `{
  "reportingMonth": "2024-06"
}`,
  },
  {
    title: "Time of day (recurring schedule)",
    intent: (
      <>
        Use when the clock time repeats daily, regardless of timezone (opening hours,
        medication reminders).
      </>
    ),
    client: `const payload = {
  reminderTime: formValues.timeString, // "09:30"
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};

await fetch("/api/reminders", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});`,
    server: `const { reminderTime, timezone } = req.body;

if (!/^\\d{2}:\\d{2}$/.test(reminderTime)) {
  return res.status(400).json({ error: "reminderTime must be HH:mm" });
}

await db.reminder.create({
  data: {
    hour: Number(reminderTime.slice(0, 2)),
    minute: Number(reminderTime.slice(3, 5)),
    timezone,
  },
});`,
    storage: (
      <>
        Save the clock fields and the user&apos;s timezone. Compute real instants
        on demand.
      </>
    ),
    response: `{
  "reminderTime": "09:30",
  "timezone": "America/Los_Angeles"
}`,
  },
  {
    title: "Year-only (broad filters)",
    intent: (
      <>
        Use when only the year matters (model-year, cohort filters, graduation year).
      </>
    ),
    client: `const payload = {
  releaseYear: Number(formValues.year), // 2024
};

await fetch("/api/releases", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});`,
    server: `const { releaseYear } = req.body;

if (!Number.isInteger(releaseYear)) {
  return res.status(400).json({ error: "releaseYear must be an integer" });
}

await db.release.create({
  data: {
    release_year: releaseYear,
  },
});`,
    storage: (
      <>
        Store as an integer or text column. Do not invent a specific date—doing so
        implies precision you do not have.
      </>
    ),
    response: `{
  "releaseYear": 2024
}`,
  },
];

const SERVER_EXAMPLE = `// Client → server: send ISO strings for instants.
fetch("/api/events", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    startsAt: new Date(selectedStart).toISOString(),
    submittedAtEpoch: Date.now(), // milliseconds since epoch
  }),
});

// Node.js/Express server
app.post("/api/events", (req, res) => {
  const { startsAt, submittedAtEpoch } = req.body;

  // Validate with Number.isFinite(Date.parse(startsAt))
  const startInstant = new Date(startsAt); // ISO with timezone → safe
  const submittedAt = new Date(submittedAtEpoch); // epoch → safe

  // Persist in UTC
  db.insert({
    starts_at_iso: startInstant.toISOString(),
    submitted_at_epoch: submittedAt.getTime(),
  });

  res.json({ startsAt: startInstant.toISOString() });
});`;

const DATE_ONLY_HELPERS = `type DateOnly = \`\${number}-\${number}-\${number}\`; // "YYYY-MM-DD"

function getTimeZoneOffsetMs(date: Date, inTimeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: inTimeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const lookup = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  const zoneTime = Date.UTC(
    lookup("year"),
    lookup("month") - 1,
    lookup("day"),
    lookup("hour"),
    lookup("minute"),
    lookup("second"),
  );

  return zoneTime - date.getTime();
}

function toUTC(dateOnly: DateOnly, inTimeZone: string) {
  const [year, month, day] = dateOnly.split("-").map(Number);
  const base = new Date(Date.UTC(year, month - 1, day));
  const firstOffset = getTimeZoneOffsetMs(base, inTimeZone);
  const candidate = new Date(base.getTime() - firstOffset);
  const correctedOffset = getTimeZoneOffsetMs(candidate, inTimeZone);
  return new Date(candidate.getTime() - correctedOffset);
}

function toDateOnlyString(date: Date): DateOnly {
  return date.toISOString().slice(0, 10) as DateOnly;
}

function daysBetween(start: DateOnly, end: DateOnly, inTimeZone: string) {
  const startUtc = toUTC(start, inTimeZone);
  const endUtc = toUTC(end, inTimeZone);
  const diff = endUtc.getTime() - startUtc.getTime();
  return Math.round(diff / (24 * 60 * 60 * 1000));
}

function addDays(date: DateOnly, days: number, inTimeZone: string): DateOnly {
  const utc = toUTC(date, inTimeZone);
  utc.setUTCDate(utc.getUTCDate() + days);
  return toDateOnlyString(utc);
}

function isWithinRange(date: DateOnly, min?: DateOnly, max?: DateOnly) {
  if (min && date < min) return false;
  if (max && date > max) return false;
  return true;
}`;

function isValidDate(value: Date) {
  return !Number.isNaN(value.getTime());
}

function App() {
  const now = useMemo(() => new Date(), []);

  const [dateOnly, setDateOnly] = useState(() => now.toISOString().slice(0, 10));
  const [monthOnly, setMonthOnly] = useState(() => now.toISOString().slice(0, 7));
  const [timeOnly, setTimeOnly] = useState(() => now.toISOString().slice(11, 16));
  const [yearOnly, setYearOnly] = useState(() => String(now.getFullYear()));
  const [localDateTime, setLocalDateTime] = useState(
    () => now.toISOString().slice(0, 16),
  );

  const parsedLocalDate = useMemo(
    () => new Date(localDateTime),
    [localDateTime],
  );

  const isoPreview = isValidDate(parsedLocalDate)
    ? parsedLocalDate.toISOString()
    : "Invalid date";

  const timezoneOffsetMinutes = isValidDate(parsedLocalDate)
    ? parsedLocalDate.getTimezoneOffset()
    : 0;

  const offsetHours = timezoneOffsetMinutes / 60;

  const safeDateOnlyPayload = `${dateOnly}T00:00:00.000Z`;
  const safeMonthPayload = `${monthOnly}-01T00:00:00.000Z`;

  return (
    <main className="app">
      <header className="hero">
        <h1>Working with JavaScript Dates End-to-End</h1>
        <p>
          This tutorial pulls together the key{" "}
          <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date">
            MDN Date APIs
          </a>{" "}
          so you can confidently move date values between a React client and a
          backend service without surprises.
        </p>
        <div className="resource-list">
          {RESOURCES.map((resource) => (
            <a
              key={resource.url}
              href={resource.url}
              target="_blank"
              rel="noreferrer"
            >
              {resource.label}
            </a>
          ))}
        </div>
      </header>

      <section className="section">
        <h2>Creating Date Objects</h2>
        <p>
          JavaScript&apos;s <code>Date</code> stores a single instant in time as
          milliseconds since the Unix epoch (00:00:00 UTC on 1 January 1970). You
          can create a <code>Date</code> with the constructor or helper methods
          documented on MDN.
        </p>
        <ul className="emphasized-list">
          <li>
            <code>new Date()</code> uses the current instant (see{" "}
            <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/Date#parameters">
              constructor parameters
            </a>
            ).
          </li>
          <li>
            <code>Date.now()</code> returns the epoch milliseconds number (see{" "}
            <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now">
              Date.now()
            </a>
            ).
          </li>
          <li>
            <code>Date.parse(isoString)</code> converts a timestamp string into
            epoch milliseconds (see{" "}
            <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse">
              Date.parse()
            </a>
            ).
          </li>
          <li>
            <code>new Date(year, monthIndex, day, hour, minute)</code> uses local
            time. The <code>monthIndex</code> is zero-based (January = 0).
          </li>
        </ul>
        <pre>
          <code>{`const fromEpoch = new Date(Date.now());
const fromISO = new Date("2024-06-01T12:00:00Z");
const fromParts = new Date(2024, 5, 1, 9, 30); // June 1st 2024 09:30 in local time`}</code>
        </pre>
      </section>

      <section className="section">
        <h2>Interactive: How Inputs Become Instants</h2>
        <p>
          Browser form controls return strings. Converting them to <code>Date</code>{" "}
          objects brings timezones into play. Experiment below to see how the same
          value is interpreted.
        </p>

        <div className="grid">
          <label>
            Full datetime (from <code>datetime-local</code>)
            <input
              type="datetime-local"
              value={localDateTime}
              onChange={(event) => setLocalDateTime(event.target.value)}
            />
          </label>
          <div className="preview">
            <strong>Interpreted as:</strong>
            <code>
              {isValidDate(parsedLocalDate)
                ? parsedLocalDate.toString()
                : "Invalid Date"}
            </code>
            <strong>ISO payload to send</strong>
            <code>{isoPreview}</code>
            <p>
              Your timezone offset is {offsetHours} hours (
              {timezoneOffsetMinutes} minutes). When you call{" "}
              <code>toISOString()</code>, the value is converted to UTC.
            </p>
          </div>
        </div>

        <div className="grid">
          <label>
            Date-only (from <code>date</code>)
            <input
              type="date"
              value={dateOnly}
              onChange={(event) => setDateOnly(event.target.value)}
            />
          </label>
          <div className="preview">
            <strong>Send this to your API:</strong>
            <code>{dateOnly}</code>
            <p>
              If your backend insists on a timestamp, convert on the server with
              a known timezone or use UTC midnight:{" "}
              <code>{safeDateOnlyPayload}</code>.
            </p>
          </div>
        </div>

        <div className="grid">
          <label>
            Month picker (from <code>month</code>)
            <input
              type="month"
              value={monthOnly}
              onChange={(event) => setMonthOnly(event.target.value)}
            />
          </label>
          <div className="preview">
            <strong>Normalized to UTC day 1:</strong>
            <code>{safeMonthPayload}</code>
            <p>
              Store the <code>YYYY-MM</code> string or the normalized instant—just
              be consistent across your API.
            </p>
          </div>
        </div>

        <div className="grid">
          <label>
            Time of day (from <code>time</code>)
            <input
              type="time"
              value={timeOnly}
              onChange={(event) => setTimeOnly(event.target.value)}
            />
          </label>
          <div className="preview">
            <strong>Keep it as:</strong>
            <code>{timeOnly}</code>
            <p>
              Combine with the user&apos;s timezone later. Sending an ISO string
              would pick an arbitrary date, which leads to shifts.
            </p>
          </div>
        </div>

        <div className="grid">
          <label>
            Year picker
            <input
              type="number"
              min={1900}
              max={3000}
              value={yearOnly}
              onChange={(event) => setYearOnly(event.target.value)}
            />
          </label>
          <div className="preview">
            <strong>Send as a primitive:</strong>
            <code>{yearOnly}</code>
            <p>
              Avoid inventing a date like January 1st—doing so implies more
              precision than you have.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>Choosing Payloads for Client ⇄ Server</h2>
        <p>
          Pick the narrowest representation that captures your intent. The table
          below outlines common scenarios and what to transmit.
        </p>
        <table>
          <thead>
            <tr>
              <th>Scenario</th>
              <th>When to use</th>
              <th>Client → Server</th>
              <th>Backend storage</th>
              <th>Server → Client</th>
            </tr>
          </thead>
          <tbody>
            {EXCHANGE_CASES.map((item) => (
              <tr key={item.label}>
                <td>{item.label}</td>
                <td>{item.when}</td>
                <td>{item.clientPayload}</td>
                <td>{item.backendStorage}</td>
                <td>{item.sendBack}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="section">
        <h2>Scenario Playbook</h2>
        <p>
          These walkthroughs show the exact payload to send, how to validate on the
          backend, what to persist, and how to respond for each common granularity.
        </p>
        <div className="scenario-grid">
          {SCENARIO_PLAYBOOK.map((scenario) => (
            <article className="scenario-card" key={scenario.title}>
              <h3>{scenario.title}</h3>
              <p className="scenario-note">{scenario.intent}</p>
              <div className="scenario-snippet">
                <strong>Client → Server</strong>
                <pre>
                  <code>{scenario.client}</code>
                </pre>
              </div>
              <div className="scenario-snippet">
                <strong>Server validation & insert</strong>
                <pre>
                  <code>{scenario.server}</code>
                </pre>
              </div>
              <p className="scenario-note">{scenario.storage}</p>
              <div className="scenario-snippet">
                <strong>Server → Client</strong>
                <pre>
                  <code>{scenario.response}</code>
                </pre>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Working with Date-Only Strings from the Server</h2>
        <p>
          Many APIs return plain <code>YYYY-MM-DD</code> values to stay timezone agnostic.
          Keep them as strings for storage and UI, then convert explicitly when you need
          to do math.
        </p>
        <ul className="emphasized-list">
          <li>
            Decide which timezone the date belongs to (usually the user&apos;s) before
            turning it into a <code>Date</code>.
          </li>
          <li>
            Create a UTC instant at midnight in that timezone using{" "}
            <code>Date.UTC</code> and <code>Intl.DateTimeFormat</code> to calculate the
            offset.
          </li>
          <li>
            Convert back to <code>YYYY-MM-DD</code> after calculations so the server
            stays offset-free.
          </li>
        </ul>
        <div className="scenario-snippet">
          <strong>Helper snippets</strong>
          <pre>
            <code>{DATE_ONLY_HELPERS}</code>
          </pre>
        </div>
        <p>
          With these helpers you can safely add, subtract, or check ranges without
          introducing hidden timezone shifts.
        </p>
        <div className="grid">
          <div className="preview">
            <strong>Range and arithmetic</strong>
            <code>{`const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
const today = toDateOnlyString(new Date());
const nextWeek = addDays(today, 7, tz);
const diff = daysBetween(today, nextWeek, tz); // 7

const selectable = isWithinRange(
  today,
  today,
  addDays(today, 30, tz),
);`}</code>
            <p>
              Notice the helpers return and accept strings, so you can store{" "}
              <code>nextWeek</code> back in your backend without leaking timezone data.
            </p>
          </div>
          <div className="preview">
            <strong>Disable dates in a picker</strong>
            <code>{`const disabled = new Set(apiDates); // ["2024-06-02", "2024-06-03"]

<DatePicker
  dayClassName={(day) => {
    const asDateOnly = day.toISOString().slice(0, 10);
    return disabled.has(asDateOnly) ? "disabled-day" : undefined;
  }}
/>`}</code>
            <p>
              Compare using the date-only representation so users in other timezones see
              the correct disabled days.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>Round-Tripping Dates Safely</h2>
        <p>
          Use ISO strings or epoch numbers when you need an exact instant. Let
          the backend set the truth for canonical values, then share them back to
          the client.
        </p>
        <pre>
          <code>{SERVER_EXAMPLE}</code>
        </pre>
        <p>
          On the server, validate every incoming string with <code>Date.parse()</code>{" "}
          and check for <code>Number.isNaN</code>. Avoid storing JavaScript{" "}
          <code>Date</code> objects directly—serialize to ISO or numbers.
        </p>
      </section>

      <section className="section">
        <h2>Common Date Pitfalls</h2>
        <ul className="emphasized-list">
          {COMMON_MISTAKES.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="section">
        <h2>Pitfall Examples</h2>
        <div className="pitfall-grid">
          {PITFALL_EXAMPLES.map((example) => (
            <article className="pitfall-card" key={example.title}>
              <h3>{example.title}</h3>
              <p className="pitfall-note">{example.badNote}</p>
              <div className="pitfall-snippet">
                <strong>Problem</strong>
                <pre>
                  <code>{example.badCode}</code>
                </pre>
              </div>
              <div className="pitfall-snippet">
                <strong>Fix</strong>
                <pre>
                  <code>{example.fixCode}</code>
                </pre>
              </div>
              <p className="pitfall-tip">{example.fixNote}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>When Dates Shift Unexpectedly</h2>
        <p>
          Date shifts happen when you mix representations. Keep these rules in
          mind:
        </p>
        <ul className="emphasized-list">
          <li>
            Converting a local date to UTC will change the clock time by your
            timezone offset. Display values with <code>date.toLocaleString()</code>{" "}
            or the <code>Intl.DateTimeFormat</code> API so users see local time.
          </li>
          <li>
            Pair <code>getUTC*</code> with <code>setUTC*</code> when you operate on
            UTC timestamps. The non-UTC variants read and write local calendar
            fields and can shift the day.
          </li>
          <li>
            Always record the timezone (or store UTC) for events bound to a
            moment. Without it you cannot reconstruct the original instant.
          </li>
          <li>
            Never rely on <code>Date</code> for recurring calendar events. Store the
            rule (<code>RRULE</code>, cron, or a <code>day/time/timezone</code>{" "}
            structure) and compute instants on demand.
          </li>
          <li>
            Prefer libraries like <code>Temporal</code> (stage 3) or{" "}
            <code>Luxon</code> when you need richer calendaring, but stick to the
            primitives shown here for broad compatibility.
          </li>
        </ul>
      </section>

      <footer className="footer">
        <p>
          Practice by building a form that posts ISO timestamps to your backend,
          verifies them with <code>Date.parse()</code>, and stores both the ISO string and
          user-facing display string. When in doubt, re-read the MDN references
          linked above.
        </p>
      </footer>
    </main>
  );
}

export default App;
