# Assistant

The assistant is a server-side seam. The default provider is not connected to a model. It does not call the network, does not store the prompt, and does not create a task.

## Request

`POST /api/assistant` requires a session. The user id is `CurrentUser` from that session. The body is `{ "prompt": "..." }`. Zod trims the prompt, rejects an empty string, and rejects more than 2000 characters. A client `userId` is stripped.

The response is one of:

```json
{ "status": "not-configured" }
```

```json
{
  "status": "suggestions",
  "suggestions": [{ "title": "...", "notes": "...", "priority": "MEDIUM" }]
}
```

`priority` is the shared task priority union. A suggestion is not a task. This route does not write a `Task` row in either state.

## Provider

`AssistantProvider` has one method: `complete(userId, prompt)`. `userId` is the session user. The implementation lives in `apps/api/src/assistant/`. `AssistantModule` is registered on `AppModule` and is not imported by tasks or any other feature.

`UnconfiguredAssistantProvider` is the default. It repeats the empty and length checks, then returns `{ "status": "not-configured" }`.

## Selecting a future provider

Set `ASSISTANT_PROVIDER` to a name. The API reads it in `selectAssistantProvider` when the module is constructed.

- Unset, empty, or `unconfigured` uses `UnconfiguredAssistantProvider`.
- Any other name also uses `UnconfiguredAssistantProvider`. It does not throw and does not call the network.
- The variable is not required at startup. Production boot still checks only `SESSION_SECRET`. Do not put an API key in this variable or in the image.

A later provider is a new `case` in `selectAssistantProvider` that returns another `AssistantProvider`. That case is the only place a model client should be constructed. Until that case exists, `/assistant` shows the not-configured state and invents no suggestions.
