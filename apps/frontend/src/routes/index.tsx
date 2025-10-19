import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'

type Chapter = {
  id: string
  title: string
  description: string
  concepts: ConceptBlock[]
  keyTakeaways: string[]
  checklist: string[]
  quiz: Quiz
  modules: ChapterModuleKey[]
}

type ConceptBlock = {
  concept: string
  what: string
  why: string
  how: string
  frontendExample?: string
  backendExample?: string
}

type Quiz = {
  question: string
  options: string[]
  answerIndex: number
  explanation: string
}

type ChapterModuleKey =
  | 'visualTools'
  | 'simpleLab'
  | 'truthTable'
  | 'playground'
  | 'requestViewer'
  | 'flowSimulator'
  | 'commonMistakes'
  | 'realWorld'
  | 'security'
  | 'errorExplorer'
  | 'cheatSheet'
  | 'references'
  | 'quiz'

type PlaygroundRequest = {
  method: string
  contentType: string
  customHeaders: string[]
  includeCredentials: boolean
  sendAuthorizationHeader: boolean
  requestOrigin: string
  targetOrigin: string
}

type PlaygroundServer = {
  allowOriginMode: 'wildcard' | 'mirror' | 'custom'
  allowOriginCustomValue: string
  allowMethods: string[]
  allowHeaders: string[]
  exposeHeaders: string[]
  allowCredentials: boolean
  includeVaryOrigin: boolean
}

type PlaygroundResult = {
  preflightTriggered: boolean
  preflightReasons: string[]
  preflightAllowed: boolean
  preflightErrors: string[]
  finalAllowed: boolean
  finalErrors: string[]
  statusBadge: 'allowed' | 'blocked'
  requestHeaders: string[]
  responseHeaders: Record<string, string>
}

type ErrorExplorerMatch = {
  id: string
  message: string
  explanation: string
  fix: string
}

export const Route = createFileRoute('/')({
  component: App,
})

const simpleMethods = ['GET', 'HEAD', 'POST']
const simpleContentTypes = [
  'text/plain',
  'application/x-www-form-urlencoded',
  'multipart/form-data',
]

const simpleHeaders = [
  'Accept',
  'Accept-Language',
  'Content-Language',
  'Content-Type',
]

const defaultRequest: PlaygroundRequest = {
  method: 'GET',
  contentType: 'application/json',
  customHeaders: [],
  includeCredentials: false,
  sendAuthorizationHeader: false,
  requestOrigin: 'https://learn-cors.dev',
  targetOrigin: 'https://api.cors-lab.dev',
}

const defaultServer: PlaygroundServer = {
  allowOriginMode: 'mirror',
  allowOriginCustomValue: 'https://learn-cors.dev',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['X-RateLimit-Remaining'],
  allowCredentials: true,
  includeVaryOrigin: true,
}

const chapters: Chapter[] = [
  {
    id: 'chapter-1',
    title: 'Chapter 1 — What is CORS?',
    description:
      'Understand the browser security model and why cross-origin requests need extra rules.',
    concepts: [
      {
        concept: 'CORS in one sentence',
        what: 'CORS is a browser security gatekeeper that decides whether a web page can read the response from another origin.',
        why: 'Without CORS, any site could silently read responses from other sites where you are logged in, leaking private data.',
        how: 'The browser blocks the response unless the server explicitly opts-in using CORS headers like Access-Control-Allow-Origin.',
        frontendExample: `fetch('https://api.cors-lab.dev/profile')\n  .then(res => res.json())\n  .catch(err => console.error('Blocked by CORS', err))`,
        backendExample: `app.get('/profile', (req, res) => {\n  res.set('Access-Control-Allow-Origin', 'https://learn-cors.dev');\n  res.json({ name: 'Riley' });\n});`,
      },
    ],
    keyTakeaways: [
      'Same-origin policy blocks cross-site data access by default.',
      'CORS only applies to browser-based requests, not server-to-server.',
      'Servers opt-in by returning the correct Access-Control-* headers.',
    ],
    checklist: [
      'Identify the requesting origin.',
      'Decide whether to trust that origin.',
      'Return Access-Control-Allow-Origin when you want to share.',
    ],
    quiz: {
      question:
        'What is the default browser behavior when a page requests data from another origin without CORS headers?',
      options: [
        'The request is cancelled before leaving the browser.',
        'The response is fetched but hidden from JavaScript.',
        'The browser asks the user for confirmation.',
        'The browser automatically retries with credentials.',
      ],
      answerIndex: 1,
      explanation:
        'The browser still sends the network request, but it withholds the response data from JavaScript unless CORS headers allow access.',
    },
    modules: ['visualTools', 'quiz'],
  },
  {
    id: 'chapter-2',
    title: 'Chapter 2 — Same-Origin vs Cross-Origin',
    description:
      'Learn how the browser decides whether two URLs share the same origin.',
    concepts: [
      {
        concept: 'Origin components',
        what: 'An origin is defined by its scheme, host, and port.',
        why: 'Changing any component (e.g., http → https) makes the request cross-origin.',
        how: 'Compare both URLs. If protocol, hostname, or port differ, treat it as cross-origin.',
        frontendExample: `new URL('https://app.example.com:443')\n// origin => https://app.example.com`,
      },
      {
        concept: 'Practical examples',
        what: 'app.example.com → api.example.com is cross-origin despite sharing a domain.',
        why: 'Browsers prevent one subdomain from reading another unless the server agrees.',
        how: 'Use explicit CORS headers or a reverse proxy to align origins.',
      },
    ],
    keyTakeaways: [
      'Origins match only when scheme, host, and port match exactly.',
      'localhost with different ports counts as cross-origin.',
      'Custom schemes like chrome-extension:// are isolated origins.',
    ],
    checklist: [
      'List all hosts an app needs to reach.',
      'Group origins that should share data.',
      'Document which origins are approved for production.',
    ],
    quiz: {
      question:
        'Is https://shop.example.com:443 allowed to read responses from https://api.example.com:443 by default?',
      options: [
        'Yes, because they share the same root domain.',
        'Yes, because they use the same port and protocol.',
        'No, because subdomains count as different origins.',
        'No, because HTTPS cannot mix with other subdomains.',
      ],
      answerIndex: 2,
      explanation:
        'Different subdomains create different origins, so CORS headers are required to share data between them.',
    },
    modules: ['visualTools', 'simpleLab', 'quiz'],
  },
  {
    id: 'chapter-3',
    title: 'Chapter 3 — Simple Requests',
    description: 'Discover which requests bypass the preflight step and why.',
    concepts: [
      {
        concept: 'What makes a request “simple”',
        what: 'Simple requests use GET, HEAD, or POST with unrestricted headers and simple content types.',
        why: 'Browsers allow these without preflight because they historically map to safe HTML form submissions.',
        how: 'Avoid custom headers and stick to plain text/form content types to stay simple.',
        frontendExample: `fetch('https://api.cors-lab.dev/public', {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },\n  body: new URLSearchParams({ q: 'search' }),\n});`,
      },
    ],
    keyTakeaways: [
      'Simple methods: GET, HEAD, POST.',
      'Simple headers: Accept, Accept-Language, Content-Language, Content-Type with simple values.',
      'Simple content types: text/plain, application/x-www-form-urlencoded, multipart/form-data.',
    ],
    checklist: [
      'Audit custom headers on cross-origin requests.',
      'Use JSON only when the API supports preflight.',
      'Document when credentials force preflight.',
    ],
    quiz: {
      question: 'Which change will make a POST request trigger a preflight?',
      options: [
        'Switching to text/plain content type.',
        'Adding the X-Requested-With header.',
        'Using URL encoded form data.',
        'Sending without a request body.',
      ],
      answerIndex: 1,
      explanation:
        'X-Requested-With is not a simple header, so the browser must preflight before sending the real request.',
    },
    modules: ['simpleLab', 'truthTable', 'quiz'],
  },
  {
    id: 'chapter-4',
    title: 'Chapter 4 — Preflight Mechanics',
    description:
      'Walk through how the browser sends the OPTIONS preflight check.',
    concepts: [
      {
        concept: 'Why preflight exists',
        what: 'Preflight asks the server for permission before sending a potentially dangerous request.',
        why: 'It prevents the browser from sending methods or headers a server has not approved.',
        how: 'The browser sends OPTIONS with Access-Control-Request-Method and headers to verify support.',
        backendExample: `app.options('/restricted', (req, res) => {\n  res.set({\n    'Access-Control-Allow-Origin': req.headers.origin,\n    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',\n    'Access-Control-Allow-Headers': 'Content-Type, Authorization',\n    'Access-Control-Max-Age': '600',\n  }).sendStatus(204);\n});`,
      },
    ],
    keyTakeaways: [
      'Preflight is triggered by non-simple methods, headers, or credentials.',
      'Servers must respond with allowed methods and headers.',
      'Max-Age can cache permissions to avoid repeated preflights.',
    ],
    checklist: [
      'Implement OPTIONS handlers for protected routes.',
      'Return Access-Control-Allow-Methods with every method you expect.',
      'Echo custom request headers in Access-Control-Allow-Headers.',
    ],
    quiz: {
      question:
        'Which header does the browser include in a preflight request to describe the real method it wants to use?',
      options: [
        'Access-Control-Allow-Method',
        'Access-Control-Request-Method',
        'Access-Control-Allow-Headers',
        'Access-Control-Request-Headers',
      ],
      answerIndex: 1,
      explanation:
        'The preflight includes Access-Control-Request-Method to tell the server which method the real request will use.',
    },
    modules: ['truthTable', 'playground', 'flowSimulator', 'quiz'],
  },
  {
    id: 'chapter-5',
    title: 'Chapter 5 — Response Headers',
    description:
      'Study every Access-Control response header and how browsers interpret it.',
    concepts: [
      {
        concept: 'Allowing origins',
        what: 'Access-Control-Allow-Origin decides who can read the response.',
        why: 'Without it, the browser hides the response body from JavaScript.',
        how: 'Return either a trusted origin or * when credentials are not needed.',
      },
      {
        concept: 'Exposing headers',
        what: 'Access-Control-Expose-Headers whitelists response headers visible to JS.',
        why: 'By default only a few headers are exposed to protect sensitive metadata.',
        how: 'Return a comma separated list of safe headers you want to expose.',
      },
    ],
    keyTakeaways: [
      'Access-Control-Allow-Origin must be present on both preflight and actual responses.',
      'Credentials require Allow-Credentials: true and a specific origin, never *.',
      'Expose-Headers allows JS to read custom headers from the response.',
    ],
    checklist: [
      'Audit each header the frontend needs to read.',
      'Avoid reflecting arbitrary Origin headers without validation.',
      'Set Vary: Origin when echoing the request origin.',
    ],
    quiz: {
      question:
        'What happens when the server echoes the Origin header but forgets Vary: Origin while using a CDN cache?',
      options: [
        'Responses may leak between callers with different origins.',
        'Browsers ignore the Access-Control-Allow-Origin header.',
        'The request always triggers a preflight.',
        'The CDN blocks the response for mixed origins.',
      ],
      answerIndex: 0,
      explanation:
        'Without Vary: Origin caches may serve a response configured for one origin to a different caller, causing data leaks.',
    },
    modules: ['playground', 'requestViewer', 'quiz'],
  },
  {
    id: 'chapter-6',
    title: 'Chapter 6 — Credentials & Cookies',
    description: 'Handle authenticated cross-origin requests safely.',
    concepts: [
      {
        concept: 'Credentialed requests',
        what: 'Request credentials include cookies, Authorization headers, TLS client certificates, or Basic auth.',
        why: 'Browsers block credentialed responses unless the server explicitly allows it.',
        how: 'Set fetch with credentials/include and return Allow-Credentials: true and a specific origin.',
        frontendExample: `fetch('https://api.cors-lab.dev/session', {\n  credentials: 'include',\n});`,
        backendExample: `res.set({\n  'Access-Control-Allow-Origin': 'https://learn-cors.dev',\n  'Access-Control-Allow-Credentials': 'true',\n});`,
      },
    ],
    keyTakeaways: [
      'Credentials require Allow-Credentials: true.',
      'Access-Control-Allow-Origin must be an exact origin, not *.',
      'Set cookies with SameSite=None; Secure for cross-site usage.',
    ],
    checklist: [
      'Use HTTPS when sending credentials.',
      'Whitelist trusted origins before echoing them back.',
      'Validate Authorization headers on the server even when CORS allows the response.',
    ],
    quiz: {
      question: 'Which combination is invalid and will be blocked by browsers?',
      options: [
        'Allow-Origin: https://learn-cors.dev with Allow-Credentials: true',
        'Allow-Origin: * with Allow-Credentials: true',
        'Allow-Origin: https://api.cors-lab.dev with Allow-Credentials: false',
        'Allow-Origin: https://learn-cors.dev with Vary: Origin',
      ],
      answerIndex: 1,
      explanation:
        'The wildcard * cannot be combined with Allow-Credentials: true. Browsers block such responses.',
    },
    modules: ['playground', 'requestViewer', 'flowSimulator', 'quiz'],
  },
  {
    id: 'chapter-7',
    title: 'Chapter 7 — Debugging & Common Mistakes',
    description: 'See real error messages and how to fix them.',
    concepts: [
      {
        concept: 'Matching headers',
        what: 'Mismatch between requested headers and allowed headers causes CORS failures.',
        why: 'If the server does not list the header, the browser assumes it is unsafe.',
        how: 'Return Access-Control-Allow-Headers that at least covers every custom header.',
      },
      {
        concept: 'OPTIONS handlers',
        what: 'Forgetting to handle OPTIONS leads to timeouts.',
        why: 'Without a valid OPTIONS response the browser blocks the real request.',
        how: 'Route OPTIONS to the same logic that returns Access-Control-Allow-* headers.',
      },
    ],
    keyTakeaways: [
      'Browser console error text points to missing headers.',
      'Network tab shows preflight status codes and bodies.',
      'Always test with credentials when deploying authentication.',
    ],
    checklist: [
      'Capture a HAR file during debugging.',
      'Confirm status codes: preflight must be 2xx with no body.',
      'Log the Origin header on the server to trace callers.',
    ],
    quiz: {
      question:
        'Which server mistake causes “Request header field Authorization is not allowed by Access-Control-Allow-Headers”?',
      options: [
        'Returning too many exposed headers',
        'Returning Allow-Headers without Authorization',
        'Using the wrong HTTP method',
        'Missing Allow-Credentials header',
      ],
      answerIndex: 1,
      explanation:
        'If Authorization is not listed in Access-Control-Allow-Headers, the browser blocks the request.',
    },
    modules: [
      'playground',
      'requestViewer',
      'commonMistakes',
      'errorExplorer',
      'quiz',
    ],
  },
  {
    id: 'chapter-8',
    title: 'Chapter 8 — Real-World Scenarios',
    description: 'Apply CORS rules to day-to-day engineering situations.',
    concepts: [
      {
        concept: 'Local development',
        what: 'Frontend on localhost:3000 calling APIs on localhost:4000 is cross-origin due to the port change.',
        why: 'Same-origin policy counts different ports as different origins.',
        how: 'Enable CORS in dev server or use a proxy (e.g., Vite dev proxy).',
      },
      {
        concept: 'Cookies across services',
        what: 'Sharing cookies between app.example and auth.example requires credentials and SameSite=None.',
        why: 'Otherwise browsers treat cookies as cross-site and refuse to send them.',
        how: 'Set response headers and cookie attributes accordingly.',
      },
      {
        concept: 'Redirects and caching',
        what: 'CORS headers must appear on every hop, including redirects.',
        why: 'Browsers verify each response; missing headers break the chain.',
        how: 'Configure upstream services and caches to forward CORS headers.',
      },
    ],
    keyTakeaways: [
      'Development proxies mimic same-origin setups.',
      'Test with staging domains that mirror production topology.',
      'Caches and redirects must preserve CORS headers.',
    ],
    checklist: [
      'Create an origin matrix for every environment.',
      'Audit CDN edge cache behaviors with Vary headers.',
      'Write integration tests that follow redirects.',
    ],
    quiz: {
      question:
        'Which fix solves “CORS header ‘Access-Control-Allow-Origin’ missing” when redirecting through a CDN?',
      options: [
        'Removing the redirect',
        'Adding the header only on the final API',
        'Ensuring every redirect step forwards the CORS headers',
        'Disabling HTTPS on the CDN',
      ],
      answerIndex: 2,
      explanation:
        'Every response, including redirects, must include the correct CORS headers so the browser maintains permission.',
    },
    modules: ['realWorld', 'playground', 'requestViewer', 'quiz'],
  },
  {
    id: 'chapter-9',
    title: 'Chapter 9 — Security Insights',
    description: 'Explore how poor CORS settings can create vulnerabilities.',
    concepts: [
      {
        concept: 'Origin reflection risks',
        what: 'Blindly echoing the Origin header allows any site to request user data.',
        why: 'Attackers can host a malicious page that tricks a victim into making authenticated requests.',
        how: 'Validate origins against a whitelist before echoing them back.',
      },
      {
        concept: 'Credential leakage',
        what: 'Allowing credentials with * effectively allows every site on the internet to steal cookies.',
        why: 'Browsers block this combination, but misconfigurations can still leak tokens through proxies.',
        how: 'Specify trusted origins and monitor logs for unexpected origins.',
      },
    ],
    keyTakeaways: [
      'Treat CORS configuration like an access control list.',
      'Implement defense-in-depth with authentication and CSRF protections.',
      'Monitor for suspicious origins in production logs.',
    ],
    checklist: [
      'Review CORS settings during security audits.',
      'Automate tests that ensure only approved origins succeed.',
      'Expire cached preflight permissions when revoking access.',
    ],
    quiz: {
      question:
        'Why is reflecting every Origin header dangerous even if your API checks authentication tokens?',
      options: [
        'Browsers ignore reflected origins on HTTPS.',
        'Attackers can send forged tokens from their site.',
        'Victims’ browsers automatically include valid cookies, exposing data.',
        'It prevents CDNs from caching responses.',
      ],
      answerIndex: 2,
      explanation:
        'Victim browsers attach real cookies to authenticated requests, so reflecting any origin lets attackers read private responses.',
    },
    modules: ['security', 'playground', 'requestViewer', 'quiz'],
  },
  {
    id: 'chapter-10',
    title: 'Chapter 10 — Reference & Next Steps',
    description: 'Summarize what you learned and collect quick references.',
    concepts: [
      {
        concept: 'Staying sharp',
        what: 'Create a deployment checklist dedicated to CORS.',
        why: 'Consistency prevents regressions and overlooked headers.',
        how: 'Automate preflight tests and document known trusted origins.',
      },
    ],
    keyTakeaways: [
      'MDN and W3C references provide canonical specs.',
      'Keep an up-to-date cheatsheet for headers, status codes, and pitfalls.',
      'Share learnings with your team using post-mortems and runbooks.',
    ],
    checklist: [
      'Save the printable cheatsheet.',
      'Bookmark official references.',
      'Plan experiments with the interactive playground before shipping changes.',
    ],
    quiz: {
      question:
        'Where can you find the authoritative developer-oriented CORS guidance?',
      options: [
        'MDN Web Docs and the W3C “CORS for Developers” draft',
        'Stack Overflow answers from 2013',
        'Any popular blog post on reverse proxies',
        'Package.json script comments',
      ],
      answerIndex: 0,
      explanation:
        'MDN and the W3C guidance contain validated, up-to-date explanations that map directly to the specification.',
    },
    modules: ['cheatSheet', 'references', 'playground', 'quiz'],
  },
]

const corsErrorLibrary: ErrorExplorerMatch[] = [
  {
    id: 'missing-allow-origin',
    message:
      "Access to fetch at 'https://api.example.com/data' from origin 'https://app.example.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.",
    explanation:
      'The server response did not include Access-Control-Allow-Origin, so the browser hid the response.',
    fix: "Return Access-Control-Allow-Origin with either the requesting origin or '*' when credentials are not required.",
  },
  {
    id: 'credentials-wildcard',
    message:
      "The value of the 'Access-Control-Allow-Origin' header in the response must not be the wildcard '*' when the request's credentials mode is 'include'.",
    explanation:
      'Credentialed requests require a specific origin; browsers block wildcard origins combined with Allow-Credentials.',
    fix: 'Echo the requesting origin (with validation) and include Access-Control-Allow-Credentials: true.',
  },
  {
    id: 'header-not-allowed',
    message:
      'Request header field Authorization is not allowed by Access-Control-Allow-Headers in preflight response.',
    explanation:
      'The preflight response omitted the Authorization header in Access-Control-Allow-Headers.',
    fix: 'Make sure Access-Control-Allow-Headers includes Authorization for routes that expect it.',
  },
  {
    id: 'method-not-allowed',
    message:
      'Method PUT is not allowed by Access-Control-Allow-Methods in preflight response.',
    explanation:
      'The preflight response did not mention PUT as an allowed method.',
    fix: 'Return Access-Control-Allow-Methods listing every method you accept, including PUT.',
  },
]

const knowledgePopups = [
  {
    title: 'Missing Access-Control-Allow-Origin',
    reasoning:
      'Without this header the browser cannot confirm the server trusts the origin, so it blocks the response.',
    fix: 'Add Access-Control-Allow-Origin with the specific origin or * when no credentials are involved.',
  },
  {
    title: 'Wildcard with Credentials',
    reasoning:
      'Allow-Credentials: true promises the response is safe only for a trusted origin. * makes that promise impossible.',
    fix: 'Switch to an allow list and echo validated origins.',
  },
  {
    title: 'Forgotten OPTIONS Handler',
    reasoning:
      'If the server responds 404/500 or times out on OPTIONS, the browser never sends the actual request.',
    fix: 'Implement an OPTIONS route that returns the correct Access-Control-Allow-* headers.',
  },
]

const sameOriginExamples = [
  {
    label: 'https://learn-cors.dev → https://learn-cors.dev',
    sameOrigin: true,
    explanation:
      'Same protocol, host, and port. Browser treats this as same-origin and no CORS is needed.',
  },
  {
    label: 'https://learn-cors.dev → https://api.cors-lab.dev',
    sameOrigin: false,
    explanation:
      'Host differs, so this is cross-origin and needs CORS approval.',
  },
  {
    label: 'http://localhost:3000 → http://localhost:4000',
    sameOrigin: false,
    explanation:
      'Different ports make the origins different even though the host is localhost.',
  },
  {
    label: 'https://app.example.com → https://app.example.com:8443',
    sameOrigin: false,
    explanation: 'Different ports on HTTPS still count as different origins.',
  },
]

const moduleMeta: Record<
  ChapterModuleKey,
  { title: string; description: string }
> = {
  visualTools: {
    title: 'Visual Flow Explorer',
    description:
      'Watch the browser → server → browser journey and compare same vs cross-origin calls.',
  },
  simpleLab: {
    title: 'Simple Request Lab',
    description:
      'Toggle methods, content types, and headers to see when the browser keeps a request “simple.”',
  },
  truthTable: {
    title: 'Preflight Truth Table',
    description:
      'Experiment with combinations that trigger an OPTIONS preflight before the real request.',
  },
  playground: {
    title: 'Interactive Playground',
    description:
      'Configure both the request and server response headers to see if the browser allows the call.',
  },
  requestViewer: {
    title: 'Request & Response Viewer',
    description:
      'Inspect raw HTTP headers and learn which values become visible to JavaScript.',
  },
  flowSimulator: {
    title: 'CORS Flow Simulator',
    description:
      'Step through the browser timeline from origin detection to final allow/block decision.',
  },
  commonMistakes: {
    title: 'Common Mistakes & Fixes',
    description:
      'Review real error messages and the server-side fixes that resolve them.',
  },
  realWorld: {
    title: 'Real-World Scenarios',
    description:
      'Study production-inspired setups like localhost proxies, credentialed APIs, and redirects.',
  },
  security: {
    title: 'Security Insights',
    description:
      'Understand how weak CORS settings can leak sensitive data and how to harden them.',
  },
  errorExplorer: {
    title: 'Error Explorer',
    description:
      'Paste console errors and get instant explanations plus recommended remediation.',
  },
  cheatSheet: {
    title: 'Cheatsheet & Checklist',
    description:
      'Download quick reminders of critical headers, credential rules, and safe patterns.',
  },
  references: {
    title: 'Reference Library',
    description:
      'Jump straight to the MDN CORS guide and W3C “CORS for Developers” resource.',
  },
  quiz: {
    title: 'Chapter Quiz',
    description:
      'Verify your understanding with instant feedback on a scenario-based question.',
  },
}

const preflightDecisionReasons = (request: PlaygroundRequest) => {
  const reasons: string[] = []
  if (!simpleMethods.includes(request.method)) {
    reasons.push(`${request.method} is not a simple method.`)
  }
  if (
    request.method === 'POST' &&
    !simpleContentTypes.includes(request.contentType)
  ) {
    reasons.push(`${request.contentType} is not a simple content type.`)
  }
  if (request.method !== 'POST' && request.contentType !== '') {
    reasons.push(
      `${request.method} requests rarely include a Content-Type and may trigger inspection.`,
    )
  }
  if (request.customHeaders.length > 0) {
    reasons.push(
      `Custom headers (${request.customHeaders.join(', ')}) require server approval.`,
    )
  }
  if (request.includeCredentials) {
    reasons.push('Credentials mode include requires extra CORS checks.')
  }
  if (request.sendAuthorizationHeader) {
    reasons.push('Authorization header is not simple and triggers preflight.')
  }
  return reasons
}

const buildPlaygroundResult = (
  request: PlaygroundRequest,
  server: PlaygroundServer,
): PlaygroundResult => {
  const preflightReasons = preflightDecisionReasons(request)
  const preflightTriggered = preflightReasons.length > 0

  const resolvedAllowOrigin =
    server.allowOriginMode === 'wildcard'
      ? '*'
      : server.allowOriginMode === 'mirror'
        ? request.requestOrigin
        : server.allowOriginCustomValue

  const allowHeadersSet = new Set(
    server.allowHeaders.map((value) => value.toLowerCase()),
  )
  const allowMethodsSet = new Set(
    server.allowMethods.map((value) => value.toUpperCase()),
  )

  const preflightErrors: string[] = []

  if (!allowMethodsSet.has(request.method)) {
    preflightErrors.push(
      `Preflight missing ${request.method} in Access-Control-Allow-Methods.`,
    )
  }

  request.customHeaders.forEach((header) => {
    if (!allowHeadersSet.has(header.toLowerCase())) {
      preflightErrors.push(
        `Preflight missing ${header} in Access-Control-Allow-Headers.`,
      )
    }
  })

  if (
    request.sendAuthorizationHeader &&
    !allowHeadersSet.has('authorization')
  ) {
    preflightErrors.push(
      'Preflight missing Authorization in Access-Control-Allow-Headers.',
    )
  }

  const preflightAllowed = preflightErrors.length === 0

  const finalErrors: string[] = []

  if (
    resolvedAllowOrigin !== '*' &&
    resolvedAllowOrigin !== request.requestOrigin
  ) {
    finalErrors.push(
      `Access-Control-Allow-Origin (${resolvedAllowOrigin}) does not match the requesting origin.`,
    )
  }

  if (resolvedAllowOrigin === '*' && request.includeCredentials) {
    finalErrors.push(
      'Wildcard origin cannot be used when credentials are included.',
    )
  }

  if (request.includeCredentials && !server.allowCredentials) {
    finalErrors.push(
      'Allow-Credentials: true is required when credentials are included.',
    )
  }

  const finalAllowed =
    finalErrors.length === 0 && (!preflightTriggered || preflightAllowed)

  const responseHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': resolvedAllowOrigin,
    'Access-Control-Allow-Methods': server.allowMethods.join(', '),
    'Access-Control-Allow-Headers': server.allowHeaders.join(', '),
  }

  if (server.allowCredentials) {
    responseHeaders['Access-Control-Allow-Credentials'] = 'true'
  }

  if (server.exposeHeaders.length > 0) {
    responseHeaders['Access-Control-Expose-Headers'] =
      server.exposeHeaders.join(', ')
  }

  if (server.includeVaryOrigin && resolvedAllowOrigin !== '*') {
    responseHeaders['Vary'] = 'Origin'
  }

  return {
    preflightTriggered,
    preflightReasons,
    preflightAllowed,
    preflightErrors,
    finalAllowed,
    finalErrors,
    statusBadge: finalAllowed ? 'allowed' : 'blocked',
    requestHeaders: buildRequestHeaders(request),
    responseHeaders,
  }
}

const buildRequestHeaders = (request: PlaygroundRequest) => {
  return [`Origin: ${request.requestOrigin}`]
}

const playgroundHeaderOptions = [
  'X-Requested-With',
  'X-Custom-Trace',
  'X-Client-Version',
]

const serverHeaderOptions = [
  'Content-Type',
  'Authorization',
  'X-Requested-With',
  'X-Custom-Trace',
]

const requestMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']

const contentTypeOptions = [
  'application/json',
  'text/plain',
  'application/x-www-form-urlencoded',
  'multipart/form-data',
  'application/xml',
]

const timelineSteps = [
  'Browser detects the request is cross-origin.',
  'Browser checks if the request is simple.',
  'If not simple, browser sends preflight (OPTIONS).',
  'Browser evaluates the preflight response.',
  'Browser sends the actual request if allowed.',
  'Browser exposes or blocks the final response.',
]

function App() {
  const [currentChapterId, setCurrentChapterId] = useState(chapters[0].id)
  const [completedChapters, setCompletedChapters] = useState<
    Record<string, boolean>
  >({})
  const [playgroundRequest, setPlaygroundRequest] =
    useState<PlaygroundRequest>(defaultRequest)
  const [playgroundServer, setPlaygroundServer] =
    useState<PlaygroundServer>(defaultServer)
  const [playgroundResult, setPlaygroundResult] = useState<PlaygroundResult>(
    () => buildPlaygroundResult(defaultRequest, defaultServer),
  )
  const [activePopup, setActivePopup] = useState<number | null>(null)
  const [timelineIndex, setTimelineIndex] = useState(0)
  const [isTimelinePlaying, setIsTimelinePlaying] = useState(false)
  const [errorText, setErrorText] = useState('')
  const [matchedError, setMatchedError] = useState<ErrorExplorerMatch | null>(
    null,
  )
  const [sameOriginSelection, setSameOriginSelection] = useState(0)
  const [simpleRequestTest, setSimpleRequestTest] = useState({
    method: 'GET',
    contentType: 'text/plain',
    customHeader: 'None',
    includeCredentials: false,
  })
  const [quizResponses, setQuizResponses] = useState<
    Record<string, number | null>
  >(() =>
    chapters.reduce(
      (acc, chapter) => {
        acc[chapter.id] = null
        return acc
      },
      {} as Record<string, number | null>,
    ),
  )

  const contentRef = useRef<HTMLElement | null>(null)

  const progress = useMemo(() => {
    const total = chapters.length
    const completed = Object.values(completedChapters).filter(Boolean).length
    return {
      total,
      completed,
      percent: Math.round((completed / total) * 100),
    }
  }, [completedChapters])

  useEffect(() => {
    setPlaygroundResult(
      buildPlaygroundResult(playgroundRequest, playgroundServer),
    )
  }, [playgroundRequest, playgroundServer])

  useEffect(() => {
    if (!isTimelinePlaying) {
      return
    }
    const handle = setInterval(() => {
      setTimelineIndex((prev) => {
        if (prev >= timelineSteps.length - 1) {
          setIsTimelinePlaying(false)
          return prev
        }
        return prev + 1
      })
    }, 1800)
    return () => clearInterval(handle)
  }, [isTimelinePlaying])

  useEffect(() => {
    if (!errorText.trim()) {
      setMatchedError(null)
      return
    }
    const match = corsErrorLibrary.find((candidate) =>
      errorText
        .toLowerCase()
        .includes(candidate.message.toLowerCase().slice(0, 60)),
    )
    setMatchedError(match ?? null)
  }, [errorText])

  const currentChapter = chapters.find(
    (chapter) => chapter.id === currentChapterId,
  )

  const simpleRequestIsSimple =
    simpleRequestTest.method === 'GET' ||
    simpleRequestTest.method === 'HEAD' ||
    (simpleRequestTest.method === 'POST' &&
      simpleContentTypes.includes(simpleRequestTest.contentType)) ||
    false

  const simpleRequestHasCustomHeader = simpleRequestTest.customHeader !== 'None'

  const simpleRequestTriggersPreflight =
    !['GET', 'HEAD', 'POST'].includes(simpleRequestTest.method) ||
    (simpleRequestTest.method === 'POST' &&
      !simpleContentTypes.includes(simpleRequestTest.contentType)) ||
    simpleRequestHasCustomHeader ||
    simpleRequestTest.includeCredentials

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    setTimelineIndex(0)
    setIsTimelinePlaying(false)
    setActivePopup(null)
  }, [currentChapterId])

  return (
    <main className="flex h-[calc(100dvh-72px)] bg-slate-950 text-slate-100">
      <aside className="w-72 shrink-0 border-r border-slate-800 bg-slate-900/60 p-4 overflow-y-auto">
        <div className="mb-6 rounded-md border border-slate-800 bg-slate-900 p-4 text-sm">
          <h2 className="text-lg font-semibold text-white">Learning Path</h2>
          <p className="mt-2 text-xs text-slate-300">
            Track progress from fundamentals to expert-level mastery.
          </p>
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>
                {progress.completed} of {progress.total} completed
              </span>
              <span>{progress.percent}%</span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>
        </div>
        <nav className="space-y-3 text-sm">
          {chapters.map((chapter) => {
            const isCompleted = completedChapters[chapter.id]
            const isActive = currentChapterId === chapter.id
            return (
              <button
                key={chapter.id}
                onClick={() => setCurrentChapterId(chapter.id)}
                className={`w-full rounded-md border p-3 text-left transition ${
                  isActive
                    ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200'
                    : 'border-slate-800 bg-slate-900 text-slate-200 hover:border-emerald-500/60 hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold">{chapter.title}</span>
                  <input
                    type="checkbox"
                    className="mt-1 accent-emerald-500"
                    checked={Boolean(isCompleted)}
                    onChange={(event) => {
                      event.stopPropagation()
                      setCompletedChapters((prev) => ({
                        ...prev,
                        [chapter.id]: !prev[chapter.id],
                      }))
                    }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-300">
                  {chapter.description}
                </p>
              </button>
            )
          })}
        </nav>
        <div>
          <h1>Hello World</h1>
        </div>
      </aside>

      <section ref={contentRef} className="flex-1 overflow-y-auto p-8">
        {currentChapter ? (
          <div className="mx-auto max-w-5xl space-y-12">
            <header className="rounded-xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-emerald-500/10">
              <p className="text-xs uppercase tracking-wide text-emerald-400">
                {currentChapter.title}
              </p>
              <h1 className="mt-2 text-3xl font-bold text-white">
                {currentChapter.description}
              </h1>
              <p className="mt-4 text-sm text-slate-300">
                Each chapter breaks down concepts using What / Why / How,
                real-world scenarios, and interactive labs. Mark the checkbox in
                the sidebar when you feel confident with the material.
              </p>
            </header>

            <ChapterLabOverview modules={currentChapter.modules} />

            <ChapterConcepts chapter={currentChapter} />

            {currentChapter.modules.map((moduleKey) => {
              switch (moduleKey) {
                case 'visualTools':
                  return (
                    <VisualFlowSection
                      key={`${currentChapter.id}-visualTools`}
                      activePopup={activePopup}
                      setActivePopup={setActivePopup}
                      sameOriginSelection={sameOriginSelection}
                      setSameOriginSelection={setSameOriginSelection}
                    />
                  )
                case 'simpleLab':
                  return (
                    <SimpleRequestLab
                      key={`${currentChapter.id}-simpleLab`}
                      data={simpleRequestTest}
                      onChange={setSimpleRequestTest}
                      triggersPreflight={simpleRequestTriggersPreflight}
                      isSimple={
                        simpleRequestIsSimple &&
                        !simpleRequestHasCustomHeader &&
                        !simpleRequestTest.includeCredentials
                      }
                    />
                  )
                case 'truthTable':
                  return (
                    <PreflightTruthTable
                      key={`${currentChapter.id}-truthTable`}
                      request={playgroundRequest}
                      onRequestChange={setPlaygroundRequest}
                      result={playgroundResult}
                    />
                  )
                case 'playground':
                  return (
                    <InteractivePlayground
                      key={`${currentChapter.id}-playground`}
                      request={playgroundRequest}
                      server={playgroundServer}
                      onRequestChange={setPlaygroundRequest}
                      onServerChange={setPlaygroundServer}
                      result={playgroundResult}
                    />
                  )
                case 'requestViewer':
                  return (
                    <RequestResponseViewer
                      key={`${currentChapter.id}-requestViewer`}
                      result={playgroundResult}
                      request={playgroundRequest}
                    />
                  )
                case 'flowSimulator':
                  return (
                    <CorsFlowSimulator
                      key={`${currentChapter.id}-flowSimulator`}
                      result={playgroundResult}
                      timelineIndex={timelineIndex}
                      setTimelineIndex={setTimelineIndex}
                      isPlaying={isTimelinePlaying}
                      setIsPlaying={setIsTimelinePlaying}
                    />
                  )
                case 'commonMistakes':
                  return (
                    <CommonMistakesSection
                      key={`${currentChapter.id}-commonMistakes`}
                    />
                  )
                case 'realWorld':
                  return (
                    <RealWorldScenarios
                      key={`${currentChapter.id}-realWorld`}
                    />
                  )
                case 'security':
                  return (
                    <SecurityInsights key={`${currentChapter.id}-security`} />
                  )
                case 'errorExplorer':
                  return (
                    <ErrorExplorer
                      key={`${currentChapter.id}-errorExplorer`}
                      errorText={errorText}
                      setErrorText={setErrorText}
                      matchedError={matchedError}
                    />
                  )
                case 'cheatSheet':
                  return <CheatSheet key={`${currentChapter.id}-cheatSheet`} />
                case 'references':
                  return (
                    <ReferenceSection key={`${currentChapter.id}-references`} />
                  )
                case 'quiz':
                  return (
                    <QuizSection
                      key={`${currentChapter.id}-quiz`}
                      chapter={currentChapter}
                      response={quizResponses[currentChapter.id]}
                      onSelect={(option) => {
                        setQuizResponses((prev) => ({
                          ...prev,
                          [currentChapter.id]: option,
                        }))
                      }}
                    />
                  )
                default:
                  return null
              }
            })}
          </div>
        ) : null}
      </section>
    </main>
  )
}

function InteractivePlayground({
  request,
  server,
  onRequestChange,
  onServerChange,
  result,
}: {
  request: PlaygroundRequest
  server: PlaygroundServer
  onRequestChange: (value: PlaygroundRequest) => void
  onServerChange: (value: PlaygroundServer) => void
  result: PlaygroundResult
}) {
  const toggleCustomHeader = (header: string) => {
    onRequestChange({
      ...request,
      customHeaders: request.customHeaders.includes(header)
        ? request.customHeaders.filter((item) => item !== header)
        : [...request.customHeaders, header],
    })
  }

  const toggleServerHeader = (header: string) => {
    onServerChange({
      ...server,
      allowHeaders: server.allowHeaders.includes(header)
        ? server.allowHeaders.filter((item) => item !== header)
        : [...server.allowHeaders, header],
    })
  }

  const badgeClass =
    result.statusBadge === 'allowed'
      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
      : 'bg-rose-500/20 text-rose-200 border-rose-500/40'

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">
            Interactive CORS Playground
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Configure a request and server response to see whether the browser
            will allow or block it. Results update instantly.
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-4 py-1 text-xs font-semibold uppercase tracking-wide ${badgeClass}`}
        >
          {result.statusBadge === 'allowed' ? 'Allowed' : 'Blocked'}
        </span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-emerald-400">
            Request configuration
          </h3>
          <div className="grid grid-cols-1 gap-4">
            <label className="text-xs text-slate-300">
              Method
              <select
                value={request.method}
                onChange={(event) =>
                  onRequestChange({
                    ...request,
                    method: event.target.value,
                  })
                }
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              >
                {requestMethods.map((method) => (
                  <option key={method}>{method}</option>
                ))}
              </select>
            </label>

            <label className="text-xs text-slate-300">
              Content-Type
              <select
                value={request.contentType}
                onChange={(event) =>
                  onRequestChange({
                    ...request,
                    contentType: event.target.value,
                  })
                }
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              >
                {contentTypeOptions.map((type) => (
                  <option key={type}>{type}</option>
                ))}
                <option value="">(not set)</option>
              </select>
            </label>

            <label className="text-xs text-slate-300">
              Request origin
              <input
                type="text"
                value={request.requestOrigin}
                onChange={(event) =>
                  onRequestChange({
                    ...request,
                    requestOrigin: event.target.value,
                  })
                }
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              />
            </label>

            <label className="text-xs text-slate-300">
              Target origin
              <input
                type="text"
                value={request.targetOrigin}
                onChange={(event) =>
                  onRequestChange({
                    ...request,
                    targetOrigin: event.target.value,
                  })
                }
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              />
            </label>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
              Custom headers
            </h4>
            <div className="mt-2 flex flex-wrap gap-2">
              {playgroundHeaderOptions.map((header) => {
                const isActive = request.customHeaders.includes(header)
                return (
                  <button
                    key={header}
                    onClick={() => toggleCustomHeader(header)}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      isActive
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-200'
                        : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-emerald-500/50 hover:text-emerald-200'
                    }`}
                  >
                    {header}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-slate-300">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={request.sendAuthorizationHeader}
                onChange={(event) =>
                  onRequestChange({
                    ...request,
                    sendAuthorizationHeader: event.target.checked,
                    customHeaders: event.target.checked
                      ? Array.from(
                          new Set([...request.customHeaders, 'Authorization']),
                        )
                      : request.customHeaders.filter(
                          (header) => header !== 'Authorization',
                        ),
                  })
                }
                className="accent-emerald-500"
              />
              Send Authorization header
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={request.includeCredentials}
                onChange={(event) =>
                  onRequestChange({
                    ...request,
                    includeCredentials: event.target.checked,
                  })
                }
                className="accent-emerald-500"
              />
              Include credentials (cookies)
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-emerald-400">
            Server response configuration
          </h3>
          <div className="grid grid-cols-1 gap-4">
            <label className="text-xs text-slate-300">
              Access-Control-Allow-Origin mode
              <select
                value={server.allowOriginMode}
                onChange={(event) =>
                  onServerChange({
                    ...server,
                    allowOriginMode: event.target
                      .value as PlaygroundServer['allowOriginMode'],
                  })
                }
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              >
                <option value="mirror">Mirror request origin</option>
                <option value="wildcard">Wildcard *</option>
                <option value="custom">Custom value</option>
              </select>
            </label>
            {server.allowOriginMode === 'custom' ? (
              <label className="text-xs text-slate-300">
                Custom Access-Control-Allow-Origin value
                <input
                  type="text"
                  value={server.allowOriginCustomValue}
                  onChange={(event) =>
                    onServerChange({
                      ...server,
                      allowOriginCustomValue: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                />
              </label>
            ) : null}

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
                Access-Control-Allow-Headers
              </h4>
              <div className="mt-2 flex flex-wrap gap-2">
                {serverHeaderOptions.map((header) => {
                  const isActive = server.allowHeaders.includes(header)
                  return (
                    <button
                      key={header}
                      onClick={() => toggleServerHeader(header)}
                      className={`rounded-full border px-3 py-1 text-xs transition ${
                        isActive
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-200'
                          : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-emerald-500/50 hover:text-emerald-200'
                      }`}
                    >
                      {header}
                    </button>
                  )
                })}
              </div>
            </div>

            <label className="text-xs text-slate-300">
              Access-Control-Allow-Methods
              <input
                type="text"
                value={server.allowMethods.join(', ')}
                onChange={(event) =>
                  onServerChange({
                    ...server,
                    allowMethods: event.target.value
                      .split(',')
                      .map((value) => value.trim().toUpperCase())
                      .filter(Boolean),
                  })
                }
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              />
            </label>

            <label className="text-xs text-slate-300">
              Access-Control-Expose-Headers
              <input
                type="text"
                value={server.exposeHeaders.join(', ')}
                onChange={(event) =>
                  onServerChange({
                    ...server,
                    exposeHeaders: event.target.value
                      .split(',')
                      .map((value) => value.trim())
                      .filter(Boolean),
                  })
                }
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              />
            </label>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={server.allowCredentials}
                  onChange={(event) =>
                    onServerChange({
                      ...server,
                      allowCredentials: event.target.checked,
                    })
                  }
                  className="accent-emerald-500"
                />
                Send Access-Control-Allow-Credentials: true
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={server.includeVaryOrigin}
                  onChange={(event) =>
                    onServerChange({
                      ...server,
                      includeVaryOrigin: event.target.checked,
                    })
                  }
                  className="accent-emerald-500"
                />
                Include Vary: Origin
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <PreflightStatusCard result={result} />
        <FinalDecisionCard result={result} />
      </div>
    </section>
  )
}

function PreflightStatusCard({ result }: { result: PlaygroundResult }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <h3 className="text-sm font-semibold text-emerald-400">
        Preflight analysis
      </h3>
      {result.preflightTriggered ? (
        <>
          <span className="mt-2 inline-block rounded-full border border-amber-400/40 bg-amber-500/20 px-3 py-1 text-[10px] font-semibold uppercase text-amber-200">
            Preflight triggered
          </span>
          <ul className="mt-3 space-y-2 text-xs text-slate-300">
            {result.preflightReasons.map((reason) => (
              <li key={reason} className="flex gap-2">
                <span className="text-emerald-400">•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
          {result.preflightAllowed ? (
            <p className="mt-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-200">
              Server approved the preflight. Browser proceeds with the real
              request.
            </p>
          ) : (
            <div className="mt-3 rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200">
              <p className="font-semibold">Preflight blocked</p>
              <ul className="mt-2 space-y-1">
                {result.preflightErrors.map((error) => (
                  <li key={error}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <p className="mt-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-200">
          Request is simple. Browser skips preflight and goes straight to the
          actual request.
        </p>
      )}
    </div>
  )
}

function FinalDecisionCard({ result }: { result: PlaygroundResult }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <h3 className="text-sm font-semibold text-emerald-400">
        Final request decision
      </h3>
      {result.finalAllowed ? (
        <p className="mt-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-200">
          Browser allows JavaScript to read the response.
        </p>
      ) : (
        <div className="mt-2 rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200">
          <p className="font-semibold">Browser blocks the response</p>
          <ul className="mt-2 space-y-1">
            {result.finalErrors.map((error) => (
              <li key={error}>• {error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function RequestResponseViewer({
  result,
  request,
}: {
  result: PlaygroundResult
  request: PlaygroundRequest
}) {
  const requestedHeaders = useMemo(() => {
    const extras = new Set<string>()
    request.customHeaders.forEach((header) => extras.add(header))
    if (request.sendAuthorizationHeader) {
      extras.add('Authorization')
    }
    return Array.from(extras)
  }, [request.customHeaders, request.sendAuthorizationHeader])

  const exposedHeaders = useMemo(() => {
    const expose = result.responseHeaders['Access-Control-Expose-Headers']
    return expose
      ? expose
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean)
      : []
  }, [result.responseHeaders])

  const finalRequestLines = [
    `${request.method} /resource HTTP/1.1`,
    `Host: ${request.targetOrigin.replace(/^https?:\/\//, '')}`,
    `Origin: ${request.requestOrigin}`,
  ]
  if (request.contentType) {
    finalRequestLines.push(`Content-Type: ${request.contentType}`)
  }
  if (request.sendAuthorizationHeader) {
    finalRequestLines.push('Authorization: Bearer <token>')
  }
  request.customHeaders.forEach((header) => {
    if (header !== 'Authorization') {
      finalRequestLines.push(`${header}: example-value`)
    }
  })
  if (request.includeCredentials) {
    finalRequestLines.push('Cookie: sessionId=abcd1234')
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">
            Request & Response Viewer
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Inspect raw HTTP details to connect headers with browser decisions.
          </p>
        </div>
        <div className="text-xs text-slate-400">
          <span className="font-semibold text-emerald-300">Highlighted</span>{' '}
          headers matter for CORS decisions.
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
          <h3 className="text-sm font-semibold text-emerald-400">
            Preflight (OPTIONS) request
          </h3>
          {result.preflightTriggered ? (
            <pre className="mt-3 max-h-80 overflow-auto text-xs text-slate-200">
              <code>
                {[
                  'OPTIONS /resource HTTP/1.1',
                  'Host: api.cors-lab.dev',
                  ...result.requestHeaders,
                  `Access-Control-Request-Method: ${request.method}`,
                  requestedHeaders.length
                    ? `Access-Control-Request-Headers: ${requestedHeaders.join(', ')}`
                    : '',
                ]
                  .filter(Boolean)
                  .join('\n')}
              </code>
            </pre>
          ) : (
            <p className="mt-3 text-xs text-slate-300">
              This configuration does not trigger a preflight. The browser jumps
              straight to the final request.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
          <h3 className="text-sm font-semibold text-emerald-400">
            Final request sent by browser
          </h3>
          <pre className="mt-3 max-h-80 overflow-auto text-xs text-slate-200">
            <code>{finalRequestLines.join('\n')}</code>
          </pre>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
          <h3 className="text-sm font-semibold text-emerald-400">
            Server response headers
          </h3>
          <pre className="mt-3 max-h-80 overflow-auto text-xs text-slate-200">
            <code>
              {Object.entries(result.responseHeaders)
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n')}
            </code>
          </pre>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
          <h3 className="text-sm font-semibold text-emerald-400">
            Visibility to JavaScript
          </h3>
          <p className="mt-2 text-xs text-slate-300">
            Some response headers are always exposed (Cache-Control,
            Content-Type, etc.). Custom headers require
            Access-Control-Expose-Headers.
          </p>
          <ul className="mt-3 space-y-1 text-xs text-slate-200">
            <li>
              • Always visible: Cache-Control, Content-Language, Content-Type,
              Expires, Last-Modified, Pragma
            </li>
            <li>
              • Exposed from server:{' '}
              {exposedHeaders.length ? exposedHeaders.join(', ') : 'None'}
            </li>
            <li>
              • Hidden from JS: other response headers remain inaccessible.
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}

function CorsFlowSimulator({
  result,
  timelineIndex,
  setTimelineIndex,
  isPlaying,
  setIsPlaying,
}: {
  result: PlaygroundResult
  timelineIndex: number
  setTimelineIndex: (value: number) => void
  isPlaying: boolean
  setIsPlaying: (value: boolean) => void
}) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">
            CORS Flow Simulator
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Step through the browser’s decision making timeline. Replay to see
            how different configurations affect each stage.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setTimelineIndex(0)
              setIsPlaying(true)
            }}
            className="rounded-full border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-200 hover:bg-emerald-500/20"
          >
            {isPlaying ? 'Replaying…' : 'Play sequence'}
          </button>
          <button
            onClick={() => {
              setIsPlaying(false)
              setTimelineIndex((index) =>
                Math.min(index + 1, timelineSteps.length - 1),
              )
            }}
            className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 hover:border-emerald-500/40 hover:text-emerald-200"
          >
            Next step
          </button>
        </div>
      </div>

      <ol className="mt-6 space-y-3 text-sm text-slate-300">
        {timelineSteps.map((step, index) => (
          <li
            key={step}
            className={`rounded-lg border p-4 transition ${
              index === timelineIndex
                ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200'
                : index < timelineIndex
                  ? 'border-emerald-500/20 bg-emerald-500/5 text-slate-200'
                  : 'border-slate-800 bg-slate-950/70'
            }`}
          >
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
              <span>Step {index + 1}</span>
              {index < timelineIndex ? (
                <span className="text-emerald-300">Completed</span>
              ) : null}
            </div>
            <p className="mt-2 text-sm">{step}</p>
          </li>
        ))}
      </ol>

      <div className="mt-6 rounded-lg border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-300">
        <p className="font-semibold text-emerald-300">Outcome summary</p>
        <p className="mt-1">
          Preflight triggered: {result.preflightTriggered ? 'Yes' : 'No'}
        </p>
        <p>Preflight allowed: {result.preflightAllowed ? 'Yes' : 'No'}</p>
        <p>Final decision: {result.finalAllowed ? 'Allowed' : 'Blocked'}</p>
      </div>
    </section>
  )
}

function VisualFlowSection({
  activePopup,
  setActivePopup,
  sameOriginSelection,
  setSameOriginSelection,
}: {
  activePopup: number | null
  setActivePopup: (value: number | null) => void
  sameOriginSelection: number
  setSameOriginSelection: (value: number) => void
}) {
  return (
    <section className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
      <div>
        <h2 className="text-2xl font-semibold text-white">
          Visual Explanation Tools
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          Follow the request as it travels browser → server → browser. Hover
          over stages to reveal the headers that influence each decision.
        </p>
      </div>

      <AnimatedFlowDiagram />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
          <h3 className="text-sm font-semibold text-emerald-400">
            Same vs Cross Origin
          </h3>
          <p className="mt-2 text-xs text-slate-300">
            Select an example to see whether CORS kicks in.
          </p>
          <div className="mt-3 space-y-2">
            {sameOriginExamples.map((example, index) => (
              <button
                key={example.label}
                onClick={() => setSameOriginSelection(index)}
                className={`w-full rounded-md border px-3 py-2 text-left text-xs transition ${
                  sameOriginSelection === index
                    ? example.sameOrigin
                      ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-200'
                      : 'border-amber-500/60 bg-amber-500/15 text-amber-200'
                    : 'border-slate-800 bg-slate-950/70 text-slate-300 hover:border-emerald-500/40 hover:text-emerald-200'
                }`}
              >
                {example.label}
              </button>
            ))}
          </div>
          <div className="mt-3 rounded-md border border-slate-800 bg-slate-950/90 p-3 text-xs text-slate-200">
            <p className="font-semibold text-emerald-300">
              {sameOriginExamples[sameOriginSelection].sameOrigin
                ? 'Same-origin'
                : 'Cross-origin'}
            </p>
            <p className="mt-2">
              {sameOriginExamples[sameOriginSelection].explanation}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
          <h3 className="text-sm font-semibold text-emerald-400">
            Why does the browser block this?
          </h3>
          <p className="mt-2 text-xs text-slate-300">
            Click a pitfall to see what header is missing.
          </p>
          <div className="mt-3 space-y-2">
            {knowledgePopups.map((popup, index) => (
              <button
                key={popup.title}
                onClick={() =>
                  setActivePopup(activePopup === index ? null : index)
                }
                className="flex w-full items-center justify-between rounded-md border border-slate-800 bg-slate-950/70 px-3 py-2 text-left text-xs text-slate-200 hover:border-emerald-500/40 hover:text-emerald-200"
              >
                <span>{popup.title}</span>
                <span className="text-emerald-400">
                  {activePopup === index ? '−' : '+'}
                </span>
              </button>
            ))}
          </div>
          {activePopup !== null ? (
            <div className="mt-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-200">
              <p className="font-semibold">
                {knowledgePopups[activePopup].title}
              </p>
              <p className="mt-2">{knowledgePopups[activePopup].reasoning}</p>
              <p className="mt-2 text-emerald-100">
                Fix: {knowledgePopups[activePopup].fix}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function AnimatedFlowDiagram() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const handle = setInterval(() => {
      setStep((prev) => (prev + 1) % 4)
    }, 2600)
    return () => clearInterval(handle)
  }, [])

  const labels = [
    {
      title: 'Browser',
      description:
        'Prepares the request and enforces the same-origin policy before exposing responses.',
    },
    {
      title: 'Preflight',
      description:
        'OPTIONS check verifies the server accepts the method, headers, and origin.',
    },
    {
      title: 'Server',
      description:
        'Validates the origin, inspects headers, and returns Access-Control-Allow-* headers.',
    },
    {
      title: 'Browser Decision',
      description:
        'If headers satisfy the rules, JavaScript gains access; otherwise, response is blocked.',
    },
  ]

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-6">
      <h3 className="text-sm font-semibold text-emerald-400">
        Animated Request Flow
      </h3>
      <p className="mt-2 text-xs text-slate-300">
        Watch the stages on loop. Focus on the highlighted step to understand
        what the browser expects.
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-4">
        {labels.map((label, index) => (
          <div
            key={label.title}
            className={`rounded-lg border p-4 text-center transition ${
              index === step
                ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200 shadow-emerald-500/20 shadow-lg'
                : 'border-slate-800 bg-slate-950/80 text-slate-200'
            }`}
          >
            <p className="text-sm font-semibold">{label.title}</p>
            <p className="mt-2 text-xs text-slate-300">{label.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function SimpleRequestLab({
  data,
  onChange,
  triggersPreflight,
  isSimple,
}: {
  data: {
    method: string
    contentType: string
    customHeader: string
    includeCredentials: boolean
  }
  onChange: (value: {
    method: string
    contentType: string
    customHeader: string
    includeCredentials: boolean
  }) => void
  triggersPreflight: boolean
  isSimple: boolean
}) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
      <h2 className="text-2xl font-semibold text-white">
        Simple Request Demonstration
      </h2>
      <p className="mt-2 text-sm text-slate-300">
        Experiment with methods, content types, headers, and credentials to see
        when a request stays “simple.”
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <label className="text-xs text-slate-300">
            Method
            <select
              value={data.method}
              onChange={(event) =>
                onChange({
                  ...data,
                  method: event.target.value,
                })
              }
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            >
              {requestMethods.map((method) => (
                <option key={method}>{method}</option>
              ))}
            </select>
          </label>

          <label className="text-xs text-slate-300">
            Content-Type
            <select
              value={data.contentType}
              onChange={(event) =>
                onChange({
                  ...data,
                  contentType: event.target.value,
                })
              }
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            >
              {contentTypeOptions.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>

          <label className="text-xs text-slate-300">
            Custom header
            <select
              value={data.customHeader}
              onChange={(event) =>
                onChange({
                  ...data,
                  customHeader: event.target.value,
                })
              }
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            >
              <option>None</option>
              <option>X-Requested-With</option>
              <option>X-Trace-Id</option>
            </select>
          </label>

          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={data.includeCredentials}
              onChange={(event) =>
                onChange({
                  ...data,
                  includeCredentials: event.target.checked,
                })
              }
              className="accent-emerald-500"
            />
            Send credentials (cookies)
          </label>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-300">
          <p>Simple request: {isSimple ? 'Yes' : 'No'}</p>
          <p>Preflight triggered: {triggersPreflight ? 'Yes' : 'No'}</p>
          <div className="mt-3 space-y-2">
            <p className="font-semibold text-emerald-300">Browser logic</p>
            <ul className="space-y-1">
              <li>
                • Method check:{' '}
                {['GET', 'HEAD', 'POST'].includes(data.method)
                  ? 'simple'
                  : 'non-simple'}
              </li>
              <li>
                • Content-Type check:{' '}
                {simpleContentTypes.includes(data.contentType)
                  ? 'simple'
                  : 'non-simple'}
              </li>
              <li>
                • Custom header:{' '}
                {data.customHeader === 'None' ? 'none' : data.customHeader}
              </li>
              <li>
                • Credentials: {data.includeCredentials ? 'include' : 'omit'}
              </li>
            </ul>
            <p className="mt-3 rounded-md border border-slate-800 bg-slate-950/80 p-3 text-xs">
              {triggersPreflight
                ? 'The browser must ask the server first with an OPTIONS preflight.'
                : 'Request is simple, so it goes straight through without preflight.'}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function PreflightTruthTable({
  request,
  onRequestChange,
  result,
}: {
  request: PlaygroundRequest
  onRequestChange: (value: PlaygroundRequest) => void
  result: PlaygroundResult
}) {
  const truthRows = [
    {
      label: 'Method',
      value: request.method,
      triggers: !simpleMethods.includes(request.method),
      explanation: simpleMethods.includes(request.method)
        ? 'Simple method'
        : 'Non-simple method triggers preflight',
    },
    {
      label: 'Content-Type',
      value: request.contentType || '(not set)',
      triggers:
        request.method === 'POST' &&
        !simpleContentTypes.includes(request.contentType),
      explanation:
        request.method === 'POST' &&
        !simpleContentTypes.includes(request.contentType)
          ? 'Non-simple content type triggers preflight'
          : 'Content type is allowed',
    },
    {
      label: 'Custom headers',
      value: request.customHeaders.length
        ? request.customHeaders.join(', ')
        : 'None',
      triggers: request.customHeaders.length > 0,
      explanation:
        request.customHeaders.length > 0
          ? 'Custom headers require confirmation'
          : 'No custom headers',
    },
    {
      label: 'Credentials mode',
      value: request.includeCredentials ? 'include' : 'omit',
      triggers: request.includeCredentials,
      explanation: request.includeCredentials
        ? 'Credentialed requests enforce stricter checks'
        : 'Credentials not included',
    },
  ]

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
      <h2 className="text-2xl font-semibold text-white">
        Preflight Truth Table
      </h2>
      <p className="mt-2 text-sm text-slate-300">
        Toggle values to see when the browser sends an OPTIONS request.
      </p>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
        <table className="min-w-full divide-y divide-slate-800 text-xs text-slate-200">
          <thead className="bg-slate-950/70">
            <tr>
              <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide">
                Factor
              </th>
              <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide">
                Value
              </th>
              <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide">
                Triggers Preflight?
              </th>
              <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide">
                Notes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-950/40">
            {truthRows.map((row) => (
              <tr key={row.label}>
                <td className="px-4 py-3 font-semibold text-emerald-300">
                  {row.label}
                </td>
                <td className="px-4 py-3">{row.value}</td>
                <td className="px-4 py-3">
                  {row.triggers ? (
                    <span className="rounded-full bg-rose-500/20 px-3 py-1 text-rose-200">
                      Yes
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-emerald-200">
                      No
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-300">{row.explanation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={() =>
            onRequestChange({
              ...request,
              method: 'POST',
              contentType: 'application/json',
              customHeaders: ['X-Requested-With'],
              includeCredentials: true,
            })
          }
          className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-200 hover:bg-emerald-500/20"
        >
          Simulate complex request
        </button>
        <button
          onClick={() =>
            onRequestChange({
              ...request,
              method: 'GET',
              contentType: 'text/plain',
              customHeaders: [],
              includeCredentials: false,
            })
          }
          className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 hover:border-emerald-500/40 hover:text-emerald-200"
        >
          Reset to simple request
        </button>
        <div className="text-xs text-slate-400">
          Current outcome:{' '}
          {result.preflightTriggered ? (
            <span className="font-semibold text-rose-200">
              Preflight triggered
            </span>
          ) : (
            <span className="font-semibold text-emerald-200">No preflight</span>
          )}
        </div>
      </div>
    </section>
  )
}

function ChapterConcepts({ chapter }: { chapter: Chapter }) {
  return (
    <section className="space-y-8">
      {chapter.concepts.map((concept) => (
        <article
          key={concept.concept}
          className="rounded-xl border border-slate-800 bg-slate-900/70 p-6"
        >
          <h2 className="text-xl font-semibold text-white">
            {concept.concept}
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
              <h3 className="text-sm font-semibold text-emerald-400">What</h3>
              <p className="mt-2 text-sm text-slate-300">{concept.what}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
              <h3 className="text-sm font-semibold text-emerald-400">Why</h3>
              <p className="mt-2 text-sm text-slate-300">{concept.why}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
              <h3 className="text-sm font-semibold text-emerald-400">How</h3>
              <p className="mt-2 text-sm text-slate-300">{concept.how}</p>
            </div>
          </div>
          {(concept.frontendExample || concept.backendExample) && (
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              {concept.frontendExample && (
                <div>
                  <h4 className="font-semibold text-emerald-400">Frontend</h4>
                  <pre className="mt-2 max-h-64 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/80 p-4 text-xs text-emerald-100">
                    <code>{concept.frontendExample}</code>
                  </pre>
                </div>
              )}
              {concept.backendExample && (
                <div>
                  <h4 className="font-semibold text-emerald-400">Backend</h4>
                  <pre className="mt-2 max-h-64 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/80 p-4 text-xs text-emerald-100">
                    <code>{concept.backendExample}</code>
                  </pre>
                </div>
              )}
            </div>
          )}
        </article>
      ))}
      <KnowledgeSummaryBox
        keyTakeaways={chapter.keyTakeaways}
        checklist={chapter.checklist}
      />
    </section>
  )
}

function ChapterLabOverview({ modules }: { modules: ChapterModuleKey[] }) {
  const items = modules
    .map((module) => ({
      key: module,
      meta: moduleMeta[module],
    }))
    .filter((item) => Boolean(item.meta))

  if (items.length === 0) {
    return null
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
      <h2 className="text-2xl font-semibold text-white">
        Hands-on Labs in this Chapter
      </h2>
      <p className="mt-2 text-sm text-slate-300">
        Work through these interactive tools to apply what you just learned.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {items.map(({ key, meta }) =>
          meta ? (
            <div
              key={key}
              className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-200"
            >
              <p className="text-sm font-semibold text-emerald-300">
                {meta.title}
              </p>
              <p className="mt-2 text-slate-300">{meta.description}</p>
            </div>
          ) : null,
        )}
      </div>
    </section>
  )
}

function KnowledgeSummaryBox({
  keyTakeaways,
  checklist,
}: {
  keyTakeaways: string[]
  checklist: string[]
}) {
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs text-emerald-50">
        <p className="font-semibold uppercase tracking-wide text-emerald-200">
          Key takeaways
        </p>
        <ul className="mt-2 space-y-1 text-emerald-100">
          {keyTakeaways.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-200">
        <p className="font-semibold uppercase tracking-wide text-emerald-300">
          Things to remember
        </p>
        <ul className="mt-2 space-y-1">
          {checklist.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function CommonMistakesSection() {
  const mistakes = [
    {
      title: "Missing 'Access-Control-Allow-Origin'",
      error:
        "No 'Access-Control-Allow-Origin' header is present on the requested resource.",
      why: 'Server forgot to opt-in to sharing the resource.',
      fix: 'Return Access-Control-Allow-Origin with the calling origin or * when appropriate.',
    },
    {
      title: 'Using * with credentials',
      error:
        "The value of the 'Access-Control-Allow-Origin' header in the response must not be '*'.",
      why: 'Browsers refuse wildcard origins when credentials are required.',
      fix: 'Return a specific origin and Access-Control-Allow-Credentials: true.',
    },
    {
      title: 'Missing OPTIONS route',
      error: 'Preflight request does not pass access control check.',
      why: 'Server responded with 404/500 or timed out for OPTIONS.',
      fix: 'Implement dedicated OPTIONS handlers that mirror your CORS config.',
    },
    {
      title: 'Forgetting Vary: Origin',
      error: 'Responses cached for one origin leak to other origins.',
      why: 'Caches serve stale responses without differentiating by origin.',
      fix: 'Add Vary: Origin when dynamically echoing the Origin header.',
    },
  ]

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
      <h2 className="text-2xl font-semibold text-white">
        Common Mistakes & Fixes
      </h2>
      <p className="mt-2 text-sm text-slate-300">
        Reference real error text from developer tools and understand the root
        cause.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {mistakes.map((mistake) => (
          <article
            key={mistake.title}
            className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-200"
          >
            <h3 className="text-sm font-semibold text-emerald-300">
              {mistake.title}
            </h3>
            <p className="mt-2 text-rose-200">Error: {mistake.error}</p>
            <p className="mt-2 text-slate-300">Why it happens: {mistake.why}</p>
            <p className="mt-2 text-emerald-200">Fix: {mistake.fix}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function RealWorldScenarios() {
  const scenarios = [
    {
      title: 'Localhost collaboration',
      correct:
        'Configure your dev server to proxy /api to http://localhost:4000, keeping requests same-origin.',
      incorrect:
        'Calling http://localhost:4000 directly without CORS headers, causing browser blocks.',
    },
    {
      title: 'Cookie-based auth',
      correct:
        'Set Allow-Origin to the exact app domain, Allow-Credentials: true, and Set-Cookie with SameSite=None; Secure.',
      incorrect:
        'Allow-Origin: * with Allow-Credentials: true, which browsers reject.',
    },
    {
      title: 'Third-party analytics',
      correct:
        'Use POST with JSON but ensure Access-Control-Allow-Headers includes Content-Type and your custom headers.',
      incorrect:
        'Sending Authorization header without updating Allow-Headers, leading to preflight failure.',
    },
  ]

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
      <h2 className="text-2xl font-semibold text-white">
        Real-World Scenarios
      </h2>
      <p className="mt-2 text-sm text-slate-300">
        Compare correct vs incorrect setups inspired by production incidents.
      </p>

      <div className="mt-4 space-y-4">
        {scenarios.map((scenario) => (
          <article
            key={scenario.title}
            className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-200"
          >
            <h3 className="text-sm font-semibold text-emerald-300">
              {scenario.title}
            </h3>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-emerald-50">
                <p className="font-semibold uppercase tracking-wide">Correct</p>
                <p className="mt-2">{scenario.correct}</p>
              </div>
              <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-rose-50">
                <p className="font-semibold uppercase tracking-wide">
                  Incorrect
                </p>
                <p className="mt-2">{scenario.incorrect}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function SecurityInsights() {
  const insights = [
    {
      title: 'Protecting user data',
      detail:
        'Without CORS, any malicious website could silently fetch your bank statements if you are logged in elsewhere.',
    },
    {
      title: 'Defense in depth',
      detail:
        'CORS is not a replacement for authentication. Always combine with strong auth checks and CSRF protection.',
    },
    {
      title: 'Incident spotlight',
      detail:
        'In 2021, several APIs leaked personal data because they mirrored Origin without validation. Attackers hosted pages that scraped user info.',
    },
  ]

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
      <h2 className="text-2xl font-semibold text-white">Security Insights</h2>
      <p className="mt-2 text-sm text-slate-300">
        Understand why browsers enforce CORS and what goes wrong when
        misconfigured.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {insights.map((insight) => (
          <div
            key={insight.title}
            className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-200"
          >
            <h3 className="text-sm font-semibold text-emerald-300">
              {insight.title}
            </h3>
            <p className="mt-2 text-slate-300">{insight.detail}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function ErrorExplorer({
  errorText,
  setErrorText,
  matchedError,
}: {
  errorText: string
  setErrorText: (value: string) => void
  matchedError: ErrorExplorerMatch | null
}) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
      <h2 className="text-2xl font-semibold text-white">Error Explorer</h2>
      <p className="mt-2 text-sm text-slate-300">
        Paste the console error from DevTools. We will decode the message and
        suggest fixes.
      </p>

      <textarea
        value={errorText}
        onChange={(event) => setErrorText(event.target.value)}
        placeholder="Paste your browser console error here…"
        className="mt-4 h-32 w-full rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-100 placeholder:text-slate-500"
      />

      {matchedError ? (
        <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs text-emerald-100">
          <p className="font-semibold text-emerald-200">{matchedError.id}</p>
          <p className="mt-2 text-emerald-100">
            Explanation: {matchedError.explanation}
          </p>
          <p className="mt-2 text-emerald-100">Fix: {matchedError.fix}</p>
        </div>
      ) : errorText ? (
        <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-100">
          <p className="font-semibold text-amber-200">
            Unknown error signature
          </p>
          <p className="mt-2">
            Make sure the full error message is pasted. Compare with the
            examples above.
          </p>
        </div>
      ) : null}
    </section>
  )
}

function CheatSheet() {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
      <h2 className="text-2xl font-semibold text-white">
        Cheatsheet & Checklist
      </h2>
      <p className="mt-2 text-sm text-slate-300">
        Save this condensed reference for daily use. Perfect for printouts or
        onboarding docs.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-200">
          <h3 className="text-sm font-semibold text-emerald-300">
            Important headers
          </h3>
          <ul className="mt-2 space-y-1">
            <li>• Access-Control-Allow-Origin</li>
            <li>• Access-Control-Allow-Methods</li>
            <li>• Access-Control-Allow-Headers</li>
            <li>• Access-Control-Max-Age</li>
            <li>• Access-Control-Expose-Headers</li>
          </ul>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-200">
          <h3 className="text-sm font-semibold text-emerald-300">
            Credential rules
          </h3>
          <ul className="mt-2 space-y-1">
            <li>• Use Allow-Credentials: true</li>
            <li>• Set SameSite=None; Secure for cookies</li>
            <li>• Avoid wildcard origins</li>
            <li>• Always use HTTPS</li>
          </ul>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-200">
          <h3 className="text-sm font-semibold text-emerald-300">
            Safe patterns
          </h3>
          <ul className="mt-2 space-y-1">
            <li>• Mirror validated origins</li>
            <li>• Cache preflight responses responsibly</li>
            <li>• Use proxies for complex integrations</li>
            <li>• Monitor logs for unexpected origins</li>
          </ul>
        </div>
      </div>
    </section>
  )
}

function QuizSection({
  chapter,
  response,
  onSelect,
}: {
  chapter: Chapter
  response: number | null
  onSelect: (index: number) => void
}) {
  const isCorrect = response === chapter.quiz.answerIndex
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
      <h2 className="text-2xl font-semibold text-white">Chapter Quiz</h2>
      <p className="mt-2 text-sm text-slate-300">
        Test your understanding before moving on.
      </p>
      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-200">
        <p className="font-semibold text-emerald-300">
          {chapter.quiz.question}
        </p>
        <div className="mt-3 space-y-2">
          {chapter.quiz.options.map((option, index) => {
            const isSelected = response === index
            const optionState =
              response !== null && index === chapter.quiz.answerIndex
                ? 'correct'
                : isSelected
                  ? 'selected'
                  : 'idle'
            const baseClass =
              optionState === 'correct'
                ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-200'
                : optionState === 'selected'
                  ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                  : 'border-slate-800 bg-slate-950/80 text-slate-200 hover:border-emerald-500/40 hover:text-emerald-200'

            return (
              <button
                key={option}
                onClick={() => onSelect(index)}
                className={`block w-full rounded-md border px-3 py-2 text-left text-xs transition ${baseClass}`}
              >
                {option}
              </button>
            )
          })}
        </div>
        {response !== null ? (
          <div
            className={`mt-3 rounded-md border px-3 py-2 text-xs ${
              isCorrect
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
                : 'border-rose-500/40 bg-rose-500/10 text-rose-100'
            }`}
          >
            {chapter.quiz.explanation}
          </div>
        ) : null}
      </div>
    </section>
  )
}

function ReferenceSection() {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
      <h2 className="text-2xl font-semibold text-white">Reference Library</h2>
      <p className="mt-2 text-sm text-slate-300">
        Dive deeper with authoritative docs and complete specifications.
      </p>

      <div className="mt-4 space-y-3 text-xs text-emerald-200">
        <a
          href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS"
          className="block rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 hover:bg-emerald-500/20"
          target="_blank"
          rel="noreferrer"
        >
          MDN — CORS Guide
        </a>
        <a
          href="https://w3c.github.io/webappsec-cors-for-developers/"
          className="block rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 hover:bg-emerald-500/20"
          target="_blank"
          rel="noreferrer"
        >
          W3C — CORS for Developers
        </a>
      </div>
    </section>
  )
}
