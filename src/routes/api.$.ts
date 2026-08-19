import { treaty } from "@elysiajs/eden";
import { createFileRoute } from "@tanstack/react-router";
import { createIsomorphicFn } from "@tanstack/react-start";

import { app } from '#/server/app';
import type { App } from '#/server/app';

const handle = ({ request }: { request: Request }) => app.fetch(request);

export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      GET: handle,
      POST: handle,
    },
  },
});

/**
 * Typed client for the Elysia app.
 *
 * On the server the app is called in-process, so there is no HTTP hop. On the
 * client it goes over the wire against the current origin — never a hardcoded
 * host, so preview and production deployments work unchanged.
 */
export const getTreaty = createIsomorphicFn()
  .server(() => treaty(app).api)
  .client(() => treaty<App>(window.location.origin).api);
