import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from "aws-lambda";
import { validatePageDocument, type PageDocument } from "@pagoda/schema";
import { renderToHTML } from "@pagoda/renderer/server";

/**
 * Direct invocation payload — used when the Lambda is called via
 * `lambda.invoke()` from the Python backend (not API Gateway).
 */
interface DirectInvocationEvent {
  pageDocument: unknown;
}

type LambdaEvent = APIGatewayProxyEvent | DirectInvocationEvent;

function isAPIGatewayEvent(event: LambdaEvent): event is APIGatewayProxyEvent {
  return "httpMethod" in event;
}

function jsonResponse(
  statusCode: number,
  body: unknown,
  contentType = "application/json",
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: { "Content-Type": contentType },
    body: typeof body === "string" ? body : JSON.stringify(body),
  };
}

export async function handler(
  event: LambdaEvent,
): Promise<APIGatewayProxyResult> {
  try {
    // Extract pageDocument from event
    let pageDocument: unknown;

    if (isAPIGatewayEvent(event)) {
      // API Gateway: parse JSON body
      if (!event.body) {
        return jsonResponse(400, { error: "Request body is required" });
      }
      try {
        pageDocument = JSON.parse(event.body);
      } catch {
        return jsonResponse(400, { error: "Invalid JSON in request body" });
      }
    } else {
      // Direct invocation from backend
      pageDocument = event.pageDocument;
    }

    if (!pageDocument) {
      return jsonResponse(400, { error: "pageDocument is required" });
    }

    // Validate against schema
    const validation = validatePageDocument(pageDocument);
    if (!validation.valid) {
      return jsonResponse(400, {
        error: "Schema validation failed",
        errors: validation.errors,
      });
    }

    // Render to HTML — safe to cast: validator confirmed shape above
    const html = renderToHTML(pageDocument as PageDocument);

    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html" },
      body: html,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return jsonResponse(500, { error: message });
  }
}
