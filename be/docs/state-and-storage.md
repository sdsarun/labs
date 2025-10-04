# State & Storage

Jason exposes batteries for handling cookies, sessions, and file uploads out of the box.

## Cookies

Incoming requests automatically expose:

```ts
req.cookies        // parsed key/value pairs
req.signedCookies  // subset verified with the session secret
```

Use response helpers to set or clear cookies:

```ts
res.cookie("token", token, {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  maxAge: 60 * 60,   // seconds
  signed: true
});
```

If `signed: true`, Jason signs the cookie using the session secret (or throws if no secret is configured). `res.clearCookie(name)` sets an immediate expiry.

## Sessions

Enable sessions globally when creating the app:

```ts
const app = jason({
  session: {
    secret: "super-secret",
    ttl: 1000 * 60 * 30, // 30 minutes
    rolling: true,
    cookie: { sameSite: "lax", secure: false }
  }
});
```

Mark routes that require sessions with `{ session: true }`:

```ts
app.get(
  "/me",
  { session: true },
  (req, res) => {
    req.session!.data.visits = (req.session!.data.visits ?? 0) + 1;
    res.json({ visits: req.session!.data.visits });
  }
);
```

The session manager stores serialized data in an in-memory store by default. You can bring your own by implementing `SessionStore` (`get`, `set`, `destroy`).

Session cookies are signed automatically and respect the cookie options you provide.

## Multipart uploads

Attach `uploads` in your route options to parse `multipart/form-data` bodies:

```ts
app.post(
  "/upload",
  {
    uploads: {
      maxFiles: 5,
      maxFileSize: 5 * 1024 * 1024,
      allowMimeTypes: ["image/png", "image/jpeg"],
      memory: true,  // keep buffers in memory; false writes to disk
      fields: [{ name: "avatar", maxCount: 1 }]
    }
  },
  (req, res) => {
    const files = req.files ?? [];
    res.json(files.map((file) => ({ name: file.filename, size: file.size })));
  }
);
```

`req.files` is an array of

```ts
interface UploadedFile {
  fieldName: string;
  filename: string;
  mimeType: string;
  encoding: string;
  size: number;
  buffer?: Buffer;       // when memory=true
  tempFilePath?: string; // when memory=false
}

// Access grouped files by field name
req.fileMap?.avatar;
```

Form fields without filenames are merged into `req.body`. The parser enforces limits you provide and throws a `400` on violations.

## Request bodies

By default Jason reads the request body into `req.rawBody`. If `Content-Type` includes `application/json`, it parses `req.body` as JSON; otherwise `req.body` contains the raw `Buffer`.

You can still mount `jason.json()` middleware for backwards compatibility—it simply ensures JSON parsing is available for early middleware.
