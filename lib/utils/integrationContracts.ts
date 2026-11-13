import type {
  AuthType,
  Connector,
  ConnectorSchemaField,
  CreateIntegrationPayload,
  DiscoverPreflightPayload,
  HttpMethod,
  PreflightTestPayload,
  ReconnectPayload,
  RotateCredentialsPayload,
  SyncDirection,
  SyncFrequency,
  TargetModuleDefinition,
  UpdateIntegrationPayload,
} from "@/types/integrations";

/**
 * Canonical Zyoris target entities and fields matching backend TARGET_SCHEMAS.
 */
export const CANONICAL_TARGET_MODULES: TargetModuleDefinition[] = [
  {
    id: "leads",
    label: "Leads (CRM)",
    description: "Capture, qualify, and route inbound sales leads into Zyoris CRM",
    entities: [
      {
        id: "Lead",
        name: "Lead",
        label: "Lead Record",
        description: "Zyoris CRM Lead records",
        targetFields: [
          { key: "name", name: "name", label: "Lead Name / Full Name", type: "string", required: true },
          { key: "email", name: "email", label: "Email Address", type: "string", required: true },
          { key: "phone", name: "phone", label: "Phone Number", type: "string", required: false },
          { key: "company", name: "company", label: "Company Name", type: "string", required: false },
          { key: "status", name: "status", label: "Lead Status", type: "string", required: false },
          { key: "source", name: "source", label: "Lead Source", type: "string", required: false },
          { key: "budget", name: "budget", label: "Estimated Budget", type: "number", required: false },
          { key: "city", name: "city", label: "City", type: "string", required: false },
        ],
      },
    ],
  },
  {
    id: "contacts",
    label: "Contacts (CRM)",
    description: "Centralized directory of people, stakeholders, and decision makers",
    entities: [
      {
        id: "Contact",
        name: "Contact",
        label: "Contact Profile",
        description: "Zyoris CRM Contact records",
        targetFields: [
          { key: "name", name: "name", label: "Contact Name", type: "string", required: true },
          { key: "email", name: "email", label: "Email Address", type: "string", required: true },
          { key: "phone", name: "phone", label: "Phone Number", type: "string", required: false },
          { key: "company", name: "company", label: "Company Name", type: "string", required: false },
          { key: "title", name: "title", label: "Job Title", type: "string", required: false },
        ],
      },
    ],
  },
  {
    id: "companies",
    label: "Companies & Accounts (CRM)",
    description: "Account profiles, business hierarchies, and firmographic data",
    entities: [
      {
        id: "Company",
        name: "Company",
        label: "Company Account",
        description: "Zyoris CRM Company / Account records",
        targetFields: [
          { key: "name", name: "name", label: "Company Name", type: "string", required: true },
          { key: "industry", name: "industry", label: "Industry", type: "string", required: false },
          { key: "website", name: "website", label: "Website URL", type: "string", required: false },
          { key: "city", name: "city", label: "City", type: "string", required: false },
          { key: "phone", name: "phone", label: "Phone Number", type: "string", required: false },
        ],
      },
    ],
  },
  {
    id: "deals",
    label: "Deals & Pipeline (CRM)",
    description: "Manage sales opportunities, pipeline stages, and revenue forecasts",
    entities: [
      {
        id: "Deal",
        name: "Deal",
        label: "Deal Opportunity",
        description: "Zyoris CRM Deal / Opportunity records",
        targetFields: [
          { key: "name", name: "name", label: "Deal Name", type: "string", required: true },
          { key: "stage", name: "stage", label: "Deal Stage", type: "string", required: true },
          { key: "amount", name: "amount", label: "Deal Amount", type: "number", required: false },
          { key: "currency", name: "currency", label: "Currency Code", type: "string", required: false },
          { key: "closeDate", name: "closeDate", label: "Expected Close Date", type: "date", required: false },
        ],
      },
    ],
  },
  {
    id: "customers",
    label: "Customers (Identity)",
    description: "Canonical customer identity profiles and lifecycle states",
    entities: [
      {
        id: "Customer",
        name: "Customer",
        label: "Customer Identity",
        description: "Canonical Customer Identity records",
        targetFields: [
          { key: "name", name: "name", label: "Customer Name", type: "string", required: true },
          { key: "email", name: "email", label: "Email Address", type: "string", required: false },
          { key: "phone", name: "phone", label: "Phone Number", type: "string", required: false },
          { key: "canonicalType", name: "canonicalType", label: "Canonical Type", type: "string", required: false },
          { key: "lifecycleState", name: "lifecycleState", label: "Lifecycle State", type: "string", required: false },
        ],
      },
    ],
  },
  {
    id: "finance",
    label: "Invoices & Billing (Finance)",
    description: "Financial billing invoices and payment statuses",
    entities: [
      {
        id: "Invoice",
        name: "Invoice",
        label: "Invoice Record",
        description: "Zyoris Finance Invoice records",
        targetFields: [
          { key: "invoiceNumber", name: "invoiceNumber", label: "Invoice Number", type: "string", required: true },
          { key: "total", name: "total", label: "Total Amount", type: "number", required: true },
          { key: "status", name: "status", label: "Invoice Status", type: "string", required: false },
          { key: "dueDate", name: "dueDate", label: "Due Date", type: "date", required: false },
        ],
      },
    ],
  },
];

const SECRET_CONFIG_KEYS = new Set([
  "apiKey",
  "apiSecret",
  "accessToken",
  "refreshToken",
  "webhookSecret",
  "clientSecret",
  "password",
  "customSecrets",
]);

export function isDynamicSchemaProvider(provider?: string | null): boolean {
  if (!provider) return false;
  const upper = provider.trim().toUpperCase();
  return upper === "CUSTOM_API" || upper === "CUSTOM_WEBHOOK";
}

export function normalizeOptionalSecret(value?: string | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function isSecretConfigField(field: ConnectorSchemaField): boolean {
  return (
    field.type === "secret" ||
    field.type === "password" ||
    Boolean(field.sensitive) ||
    SECRET_CONFIG_KEYS.has(field.name)
  );
}

/**
 * Extract unified configFields list from catalog connector metadata.
 */
export function extractConnectorConfigFields(
  connector?: Connector | null
): ConnectorSchemaField[] {
  if (!connector) return [];

  const combined: ConnectorSchemaField[] = [
    ...(Array.isArray(connector.configFields) ? connector.configFields : []),
    ...(Array.isArray(connector.configSchema?.fields) ? connector.configSchema.fields : []),
    ...(Array.isArray(connector.configSchema?.auth?.fields)
      ? connector.configSchema.auth.fields
      : []),
  ];

  const seen = new Set<string>();
  const deduped: ConnectorSchemaField[] = [];
  for (const field of combined) {
    if (field?.name && !seen.has(field.name)) {
      seen.add(field.name);
      deduped.push(field);
    }
  }
  return deduped;
}

export function sanitizeDynamicConfigValues(
  dynamicFields?: Record<string, any> | null
): Record<string, any> {
  if (!dynamicFields || typeof dynamicFields !== "object") return {};
  const cleaned: Record<string, any> = {};
  for (const [k, v] of Object.entries(dynamicFields)) {
    if (SECRET_CONFIG_KEYS.has(k)) continue;
    if (typeof v === "string") {
      const trimmed = v.trim();
      if (trimmed.length > 0) cleaned[k] = trimmed;
    } else if (v !== undefined && v !== null) {
      cleaned[k] = v;
    }
  }
  return cleaned;
}

function buildCustomSecretsMap(
  extras: Array<[string, string | undefined | null]>
): Record<string, string> | undefined {
  const result: Record<string, string> = {};
  for (const [k, v] of extras) {
    const clean = normalizeOptionalSecret(v);
    if (clean) {
      result[k] = clean;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function resolveBaseCredentialFields(input: {
  authType?: AuthType | string;
  apiKeyName?: string;
  apiKeyValue?: string;
  bearerToken?: string;
  basicUsername?: string;
  basicPassword?: string;
  oauthClientSecret?: string;
  webhookSecret?: string;
  dynamicSecrets?: Record<string, string>;
}): {
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  webhookSecret?: string;
  clientSecret?: string;
  password?: string;
  customSecrets?: Record<string, string>;
} {
  const ds = input.dynamicSecrets || {};
  const auth = String(input.authType || "API_KEY").toUpperCase();

  const apiKey =
    normalizeOptionalSecret(ds.apiKey) ||
    (auth === "API_KEY" || auth === "NONE"
      ? normalizeOptionalSecret(input.apiKeyValue)
      : undefined);

  const accessToken =
    normalizeOptionalSecret(ds.accessToken) ||
    (auth === "BEARER_TOKEN" || auth === "OAUTH2"
      ? normalizeOptionalSecret(input.bearerToken)
      : undefined);

  const apiSecret = normalizeOptionalSecret(ds.apiSecret);
  const clientSecret =
    normalizeOptionalSecret(ds.clientSecret) ||
    (auth === "OAUTH2" ? normalizeOptionalSecret(input.oauthClientSecret) : undefined);

  const webhookSecret =
    normalizeOptionalSecret(ds.webhookSecret) ||
    normalizeOptionalSecret(input.webhookSecret);

  const password =
    normalizeOptionalSecret(ds.password) ||
    (auth === "BASIC_AUTH" ? normalizeOptionalSecret(input.basicPassword) : undefined);

  const extraPairs: Array<[string, string | undefined | null]> = Object.entries(ds)
    .filter(([k]) => !SECRET_CONFIG_KEYS.has(k))
    .map(([k, v]) => [k, v]);

  if (auth === "API_KEY" && apiKey && normalizeOptionalSecret(input.apiKeyName)) {
    extraPairs.push(["headerName", input.apiKeyName]);
  }
  if (auth === "BASIC_AUTH" && (password || normalizeOptionalSecret(input.basicUsername))) {
    extraPairs.push(["username", input.basicUsername]);
  }

  const customSecrets = buildCustomSecretsMap(extraPairs);

  return {
    ...(apiKey ? { apiKey } : {}),
    ...(apiSecret ? { apiSecret } : {}),
    ...(accessToken ? { accessToken } : {}),
    ...(clientSecret ? { clientSecret } : {}),
    ...(webhookSecret ? { webhookSecret } : {}),
    ...(password ? { password } : {}),
    ...(customSecrets ? { customSecrets } : {}),
  };
}

export interface WizardPayloadInput {
  connector: Connector | null;
  displayName: string;
  targetModule: string;
  targetEntity: string;
  apiUrl?: string;
  httpMethod: HttpMethod;
  authType: AuthType;
  apiKeyName?: string;
  apiKeyValue?: string;
  bearerToken?: string;
  basicUsername?: string;
  basicPassword?: string;
  oauthClientId?: string;
  oauthClientSecret?: string;
  webhookSecret?: string;
  syncDirection: SyncDirection;
  syncFrequency: SyncFrequency;
  headers?: Array<{ key: string; value: string }>;
  contentType?: string;
  queryParams?: Array<{ key: string; value?: string }>;
  requestBody?: any;
  dynamicFields?: Record<string, any>;
  dynamicSecrets?: Record<string, string>;
}

export function buildWizardIntegrationPayload(
  input: WizardPayloadInput
): CreateIntegrationPayload {
  const provider = String(
    input.connector?.provider || input.connector?.id || "CUSTOM_API"
  ).toUpperCase();

  const headerObject: Record<string, string> = {};
  (input.headers || []).forEach((h) => {
    if (h.key?.trim() && h.value?.trim()) {
      headerObject[h.key.trim()] = h.value.trim();
    }
  });

  const cleanDynamic = sanitizeDynamicConfigValues(input.dynamicFields);
  const resolvedBaseUrl =
    normalizeOptionalSecret(cleanDynamic.baseUrl) ||
    normalizeOptionalSecret(input.apiUrl);
  const resolvedRedirectUri = normalizeOptionalSecret(cleanDynamic.redirectUri);

  const authFields = resolveBaseCredentialFields({
    authType: input.authType,
    apiKeyName: input.apiKeyName,
    apiKeyValue: input.apiKeyValue,
    bearerToken: input.bearerToken,
    basicUsername: input.basicUsername,
    basicPassword: input.basicPassword,
    oauthClientSecret: input.oauthClientSecret,
    webhookSecret: input.webhookSecret,
    dynamicSecrets: input.dynamicSecrets,
  });

  const cleanedQueryParams = (input.queryParams || [])
    .filter((p) => Boolean(p.key?.trim()))
    .map((p) => ({
      key: p.key.trim(),
      value: p.value ? p.value.trim() : "",
    }));

  const configPayload: Record<string, any> = {
    ...cleanDynamic,
    targetModule: input.targetModule,
    targetEntity: input.targetEntity,
    ...(resolvedBaseUrl ? { apiUrl: normalizeOptionalSecret(input.apiUrl) || resolvedBaseUrl, baseUrl: resolvedBaseUrl } : {}),
    httpMethod: input.httpMethod,
    syncDirection: input.syncDirection,
    syncFrequency: input.syncFrequency,
    ...(Object.keys(headerObject).length > 0 ? { headers: headerObject } : {}),
    ...(input.contentType ? { contentType: input.contentType } : {}),
    ...(cleanedQueryParams.length > 0 ? { queryParams: cleanedQueryParams } : {}),
    ...(input.requestBody !== undefined ? { requestBody: input.requestBody } : {}),
  };

  if (
    provider === "CUSTOM_API" &&
    !configPayload.authHeaderName &&
    normalizeOptionalSecret(input.apiKeyName)
  ) {
    configPayload.authHeaderName = input.apiKeyName!.trim();
  }

  return {
    provider,
    name: input.displayName.trim() || `${input.connector?.name || provider} Integration`,
    authType: input.authType,
    ...authFields,
    ...(resolvedBaseUrl ? { baseUrl: resolvedBaseUrl } : {}),
    ...(resolvedRedirectUri ? { redirectUri: resolvedRedirectUri } : {}),
    config: configPayload,
  };
}

/**
 * Project a wizard CreateIntegrationPayload to a PATCH-compliant UpdateIntegrationPayload
 * matching backend updateIntegrationSchema.strict().
 */
export function toStrictUpdatePayload(
  payload: CreateIntegrationPayload
): UpdateIntegrationPayload {
  return {
    ...(payload.name ? { name: payload.name } : {}),
    ...(payload.baseUrl ? { baseUrl: payload.baseUrl } : {}),
    ...(payload.redirectUri ? { redirectUri: payload.redirectUri } : {}),
    ...(payload.apiKey ? { apiKey: payload.apiKey } : {}),
    ...(payload.apiSecret ? { apiSecret: payload.apiSecret } : {}),
    ...(payload.accessToken ? { accessToken: payload.accessToken } : {}),
    ...(payload.refreshToken ? { refreshToken: payload.refreshToken } : {}),
    ...(payload.webhookSecret ? { webhookSecret: payload.webhookSecret } : {}),
    ...(payload.clientSecret ? { clientSecret: payload.clientSecret } : {}),
    ...(payload.password ? { password: payload.password } : {}),
    ...(payload.customSecrets ? { customSecrets: payload.customSecrets } : {}),
    ...(payload.config ? { config: payload.config } : {}),
  };
}

export function buildPreflightTestPayload(
  payload: CreateIntegrationPayload
): PreflightTestPayload {
  return {
    provider: payload.provider,
    authType: payload.authType,
    ...(payload.apiKey ? { apiKey: payload.apiKey } : {}),
    ...(payload.apiSecret ? { apiSecret: payload.apiSecret } : {}),
    ...(payload.accessToken ? { accessToken: payload.accessToken } : {}),
    ...(payload.refreshToken ? { refreshToken: payload.refreshToken } : {}),
    ...(payload.webhookSecret ? { webhookSecret: payload.webhookSecret } : {}),
    ...(payload.clientSecret ? { clientSecret: payload.clientSecret } : {}),
    ...(payload.password ? { password: payload.password } : {}),
    ...(payload.customSecrets ? { customSecrets: payload.customSecrets } : {}),
    ...(payload.baseUrl ? { baseUrl: payload.baseUrl } : {}),
    config: payload.config || {},
  };
}

export function buildPreflightDiscoverPayload(
  payload: CreateIntegrationPayload,
  samplePayload?: unknown
): DiscoverPreflightPayload {
  return {
    ...buildPreflightTestPayload(payload),
    ...(samplePayload !== undefined ? { samplePayload } : {}),
  };
}

export interface EditModalPayloadInput {
  provider?: string | null;
  displayName: string;
  syncFrequency: SyncFrequency;
  syncDirection: SyncDirection;
  apiUrl?: string;
  httpMethod: HttpMethod;
  headers?: Array<{ key: string; value: string }>;
  dynamicFields?: Record<string, any>;
  isUpdatingCredentials: boolean;
  authType?: AuthType | string;
  apiKeyName?: string;
  apiKeyValue?: string;
  bearerToken?: string;
  basicUsername?: string;
  basicPassword?: string;
  webhookSecret?: string;
  dynamicSecrets?: Record<string, string>;
}

/**
 * Build PATCH /api/v1/integrations/:id payload matching updateIntegrationSchema.strict().
 * Omitted or blank secret values are never sent.
 */
export function buildEditIntegrationPayload(
  input: EditModalPayloadInput
): UpdateIntegrationPayload {
  const headerObject: Record<string, string> = {};
  (input.headers || []).forEach((h) => {
    if (h.key?.trim() && h.value?.trim()) {
      headerObject[h.key.trim()] = h.value.trim();
    }
  });

  const cleanDynamic = sanitizeDynamicConfigValues(input.dynamicFields);
  const resolvedBaseUrl =
    normalizeOptionalSecret(cleanDynamic.baseUrl) ||
    normalizeOptionalSecret(input.apiUrl);
  const resolvedRedirectUri = normalizeOptionalSecret(cleanDynamic.redirectUri);

  const config: Record<string, any> = {
    ...cleanDynamic,
    syncFrequency: input.syncFrequency,
    syncDirection: input.syncDirection,
    httpMethod: input.httpMethod,
    ...(normalizeOptionalSecret(input.apiUrl)
      ? { apiUrl: input.apiUrl!.trim() }
      : resolvedBaseUrl
        ? { apiUrl: resolvedBaseUrl }
        : {}),
    ...(resolvedBaseUrl ? { baseUrl: resolvedBaseUrl } : {}),
    headers: headerObject,
  };

  const credentialPatch = input.isUpdatingCredentials
    ? resolveBaseCredentialFields({
        authType: input.authType,
        apiKeyName: input.apiKeyName,
        apiKeyValue: input.apiKeyValue,
        bearerToken: input.bearerToken,
        basicUsername: input.basicUsername,
        basicPassword: input.basicPassword,
        webhookSecret: input.webhookSecret,
        dynamicSecrets: input.dynamicSecrets,
      })
    : {};

  return {
    ...(input.displayName.trim() ? { name: input.displayName.trim() } : {}),
    ...(resolvedBaseUrl ? { baseUrl: resolvedBaseUrl } : {}),
    ...(resolvedRedirectUri ? { redirectUri: resolvedRedirectUri } : {}),
    config,
    ...credentialPatch,
  };
}

export function buildReconnectModalPayload(args: {
  updateCredentials: boolean;
  authType?: AuthType | string;
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  password?: string;
  webhookSecret?: string;
  dynamicFields?: Record<string, any>;
}): ReconnectPayload | undefined {
  const cleanConfig = sanitizeDynamicConfigValues(args.dynamicFields);
  const payload: ReconnectPayload = {};

  if (Object.keys(cleanConfig).length > 0) {
    payload.config = cleanConfig;
    if (typeof cleanConfig.baseUrl === "string") payload.baseUrl = cleanConfig.baseUrl;
    if (typeof cleanConfig.redirectUri === "string") payload.redirectUri = cleanConfig.redirectUri;
  }

  if (args.updateCredentials) {
    const k = normalizeOptionalSecret(args.apiKey);
    const s = normalizeOptionalSecret(args.apiSecret);
    const t = normalizeOptionalSecret(args.accessToken);
    const p = normalizeOptionalSecret(args.password);
    const w = normalizeOptionalSecret(args.webhookSecret);
    if (k) payload.apiKey = k;
    if (s) payload.apiSecret = s;
    if (t) payload.accessToken = t;
    if (p) payload.password = p;
    if (w) payload.webhookSecret = w;
  }

  return Object.keys(payload).length > 0 ? payload : undefined;
}

export function buildRotateModalPayload(args: {
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  clientSecret?: string;
  password?: string;
  webhookSecret?: string;
  customSecrets?: Array<{ key: string; value: string }>;
}): RotateCredentialsPayload {
  const payload: RotateCredentialsPayload = {};
  const k = normalizeOptionalSecret(args.apiKey);
  const a = normalizeOptionalSecret(args.accessToken);
  const r = normalizeOptionalSecret(args.refreshToken);
  const exp = normalizeOptionalSecret(args.tokenExpiresAt);
  const cs = normalizeOptionalSecret(args.clientSecret);
  const p = normalizeOptionalSecret(args.password);
  const w = normalizeOptionalSecret(args.webhookSecret);

  if (k) payload.apiKey = k;
  if (a) payload.accessToken = a;
  if (r) payload.refreshToken = r;
  if (exp) {
    const parsedExp = new Date(exp);
    if (!Number.isNaN(parsedExp.getTime())) {
      payload.tokenExpiresAt = parsedExp.toISOString();
    }
  }
  if (cs) payload.clientSecret = cs;
  if (p) payload.password = p;
  if (w) payload.webhookSecret = w;

  if (Array.isArray(args.customSecrets) && args.customSecrets.length > 0) {
    const customObj: Record<string, string> = {};
    for (const item of args.customSecrets) {
      if (item.key?.trim() && item.value?.trim()) {
        customObj[item.key.trim()] = item.value.trim();
      }
    }
    if (Object.keys(customObj).length > 0) {
      payload.customSecrets = customObj;
    }
  }

  return payload;
}

/**
 * Provider-managed OAuth 2.0 connectors that follow the direct authorization flow.
 */
export const OAUTH_PROVIDERS = new Set<string>([
  "GOOGLE_WORKSPACE",
  "HUBSPOT",
  "SALESFORCE",
  "ZOHO",
  "SLACK",
  "SHOPIFY",
]);

const INTERNAL_CONFIG_FIELD_NAMES = new Set<string>([
  "redirecturi",
  "clientid",
  "clientsecret",
  "apikey",
  "apisecret",
  "accesstoken",
  "refreshtoken",
  "webhooksecret",
  "password",
]);

const DEFAULT_PRE_AUTH_FIELDS: Record<string, ConnectorSchemaField[]> = {
  SHOPIFY: [
    {
      name: "shopDomain",
      label: "Shopify Store Domain",
      type: "text",
      required: true,
      placeholder: "your-store.myshopify.com",
      description: "The .myshopify.com domain of your store (e.g. my-brand.myshopify.com)",
    },
    {
      name: "accessMode",
      label: "Token Access Mode",
      type: "select",
      required: false,
      defaultValue: "offline",
      options: [
        { label: "Offline (Background sync & webhooks)", value: "offline" },
        { label: "Online (Per-user expiring session)", value: "online" },
      ],
    },
  ],
  ZOHO: [
    {
      name: "dataCenter",
      label: "Data Center Region",
      type: "select",
      required: false,
      defaultValue: "com",
      description: "Select the region where your Zoho CRM account is hosted",
      options: [
        { label: "United States (.com)", value: "com" },
        { label: "Europe (.eu)", value: "eu" },
        { label: "India (.in)", value: "in" },
        { label: "Australia (.com.au)", value: "com.au" },
        { label: "China (.com.cn)", value: "com.cn" },
        { label: "Japan (.jp)", value: "jp" },
      ],
    },
  ],
  SALESFORCE: [
    {
      name: "environment",
      label: "Salesforce Environment",
      type: "select",
      required: false,
      defaultValue: "production",
      description: "Choose between standard Production or a Sandbox / Developer org",
      options: [
        { label: "Production (login.salesforce.com)", value: "production" },
        { label: "Sandbox / Test (test.salesforce.com)", value: "sandbox" },
      ],
    },
  ],
};

/**
 * Checks whether a given connector is a provider-managed OAuth 2.0 integration.
 */
export function isProviderManagedOAuth(connector?: Connector | null): boolean {
  if (!connector) return false;
  const p = (connector.provider || "").toUpperCase().trim();
  if (OAUTH_PROVIDERS.has(p)) return true;
  if (connector.authType === "OAUTH2") return true;
  return false;
}

/**
 * Returns any configuration fields required or optional before redirecting to OAuth.
 * Google Workspace, HubSpot, and Slack require zero pre-auth inputs (returns empty array).
 * Shopify requires shopDomain; Zoho supports dataCenter; Salesforce supports environment.
 */
export function getOAuthPreAuthFields(connector?: Connector | null): ConnectorSchemaField[] {
  if (!connector || !isProviderManagedOAuth(connector)) return [];
  const p = (connector.provider || "").toUpperCase().trim();

  // Explicit zero-config 1-click providers
  if (p === "GOOGLE_WORKSPACE" || p === "HUBSPOT" || p === "SLACK") {
    return [];
  }

  // If connector has user-facing configFields from backend catalog, use them
  if (Array.isArray(connector.configFields) && connector.configFields.length > 0) {
    const userFacing = connector.configFields.filter((f) => {
      const name = (f.name || "").toLowerCase().replace(/[-_]/g, "");
      return !INTERNAL_CONFIG_FIELD_NAMES.has(name);
    });
    if (userFacing.length > 0) {
      return userFacing;
    }
  }

  return DEFAULT_PRE_AUTH_FIELDS[p] || [];
}

/**
 * Checks whether the connector requires any user input prior to initiating OAuth redirect.
 */
export function requiresPreAuthUserInput(connector?: Connector | null): boolean {
  const fields = getOAuthPreAuthFields(connector);
  return fields.length > 0;
}
