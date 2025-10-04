# Validation

Jason ships with an adapter layer that wraps any shape of validator into a unified async contract. Attach validators via the `validate` route option.

## `ValidationConfig`

```ts
interface ValidationConfig {
  params?: ValidatorFunction;
  query?: ValidatorFunction;
  body?: ValidatorFunction;
  response?: ValidatorFunction;
}
```

Each property accepts either a custom function or schema object. Implementation recognises common patterns:

- Functions `(value, req) => value` or async equivalents.
- Zod-style objects with `safeParse`, `parse`, or `parseAsync`.
- Yup-style (matching `validate` / `validateSync`).

If validation passes, the normalized values are stored on `req.validated`. If validation fails, Jason automatically replies with:

```json
{
  "error": "Validation failed",
  "details": { ... }
}
```

and a `400 Bad Request` status.

### Example – Zod

```ts
import { z } from "zod";

const paramsSchema = z.object({ id: z.string().uuid() });
const bodySchema = z.object({ name: z.string().min(1) });
const responseSchema = z.object({ id: z.string(), name: z.string() });

app.put(
  "/users/:id",
  {
    validate: {
      params: paramsSchema,
      body: bodySchema,
      response: responseSchema
    }
  },
  (req, res) => {
    const params = req.validated!.params as z.infer<typeof paramsSchema>;
    const body = req.validated!.body as z.infer<typeof bodySchema>;

    const updated = updateUser(params.id, body);
    res.json(updated); // response schema enforced automatically
  }
);
```

### Example – Custom functions

```ts
app.post(
  "/login",
  {
    validate: {
      body: (value) => {
        if (!value || typeof value !== "object") throw new Error("payload required");
        if (typeof value.email !== "string") throw new Error("email is required");
        return { email: value.email.toLowerCase() };
      }
    }
  },
  (req, res) => {
    const { email } = req.validated!.body as { email: string };
    res.json({ message: `Welcome ${email}` });
  }
);
```

### Response validation

Setting `validate.response` wraps `res.json` and `res.send`. Attempts to emit an invalid payload yield a `400` with error details. The original handler is not re-executed.

### Accessing validated data

`req.validated` is lazily created, so check it exists before casting:

```ts
if (!req.validated?.body) {
  throw new Error("Unexpected missing validation");
}
const body = req.validated.body as MyType;
```

### Error details

Whenever a validator throws or returns a schema-specific error object, Jason serialises `{ message, name }` by default. If the error contains richer data (e.g., Zod's structured output), it is forwarded verbatim under `details` for client consumption.
