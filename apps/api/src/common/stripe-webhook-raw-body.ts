import type { FastifyInstance, FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    rawBody?: Buffer;
  }
}

export async function registerStripeWebhookRawBody(app: FastifyInstance) {
  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (request: FastifyRequest, body: Buffer, done) => {
      if (request.url === "/api/billing/webhook") {
        request.rawBody = body;
      }

      try {
        const json = body.length > 0 ? JSON.parse(body.toString("utf8")) : {};
        done(null, json);
      } catch (error) {
        done(error as Error, undefined);
      }
    },
  );
}
