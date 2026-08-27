export const REST_HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

export const REST_CONTENT_TYPES = [
  "application/json",
  "application/x-www-form-urlencoded",
  "text/plain",
] as const;

export type RestHttpMethod = (typeof REST_HTTP_METHODS)[number];
export type RestContentType = (typeof REST_CONTENT_TYPES)[number];

export interface RestQueryParam {
  key: string;
  value: string;
}

export interface RestConfigurationValues {
  apiUrl: string;
  httpMethod: RestHttpMethod;
  contentType: RestContentType;
  queryParams: RestQueryParam[];
  requestBody: string;
}

export const DEFAULT_REST_CONFIGURATION: Pick<
  RestConfigurationValues,
  "contentType" | "queryParams" | "requestBody"
> = {
  contentType: "application/json",
  queryParams: [],
  requestBody: "",
};

export function parseRequestBody(value: string): unknown {
  if (!value.trim()) return undefined;
  return JSON.parse(value);
}
// Request bodies are parsed before submission so invalid JSON is rejected early.
