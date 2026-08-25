export type ConnectorCategory =
  | "CRM"
  | "FINANCE"
  | "MARKETING"
  | "COMMUNICATIONS"
  | "HR"
  | "PROJECTS"
  | "CUSTOM";

export type AuthType =
  | "OAUTH2"
  | "API_KEY"
  | "BEARER_TOKEN"
  | "BASIC_AUTH"
  | "WEBHOOK_SECRET"
  | "NONE";

export type SyncDirection = "INBOUND" | "OUTBOUND" | "BIDIRECTIONAL";

export type SyncFrequency =
  | "REALTIME"
  | "HOURLY"
  | "EVERY_6_HOURS"
  | "DAILY"
  | "WEEKLY"
  | "MANUAL";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type IntegrationStatus =
  | "ACTIVE"
  | "CONNECTED"
  | "PAUSED"
  | "ERROR"
  | "DISCONNECTED"
  | "PENDING";

export interface ConnectorFieldOption {
  label: string;
  value: string;
}

export interface ConnectorSchemaField {
  name: string;
  label: string;
  type:
    | "text"
    | "password"
    | "url"
    | "select"
    | "textarea"
    | "number"
    | "boolean";
  required?: boolean;
  placeholder?: string;
  description?: string;
  options?: ConnectorFieldOption[];
  defaultValue?: any;
  sensitive?: boolean;
}

export interface ConnectorAuthSchema {
  type?: AuthType | string;
  fields?: ConnectorSchemaField[];
}

export interface ConnectorEndpointSchema {
  defaultUrl?: string;
  urlPlaceholder?: string;
  supportedMethods?: HttpMethod[];
  defaultMethod?: HttpMethod;
  headers?: Record<string, string>;
}

export interface ConnectorSyncSchema {
  supportedDirections?: SyncDirection[];
  defaultDirection?: SyncDirection;
  supportedFrequencies?: SyncFrequency[];
  defaultFrequency?: SyncFrequency;
}

export interface ConnectorModuleSchema {
  id: string;
  name: string;
  description?: string;
  entities?: string[];
}

export interface ConnectorConfigSchema {
  auth?: ConnectorAuthSchema;
  endpoint?: ConnectorEndpointSchema;
  sync?: ConnectorSyncSchema;
  modules?: ConnectorModuleSchema[];
  requiredFields?: string[];
  fields?: ConnectorSchemaField[];
}

export interface Connector {
  id: string;
  provider: string;
  name: string;
  description: string;
  category: ConnectorCategory | string;
  icon?: string;
  iconUrl?: string;
  logoUrl?: string;
  version?: string;
  status?: IntegrationStatus | string;
  isConnected?: boolean;
  connectionId?: string;
  connectionState?: {
    id?: string;
    status?: IntegrationStatus | string;
    lastSyncAt?: string;
    errorCount?: number;
    lastError?: string;
    displayName?: string;
  };
  authType?: AuthType | string;
  supportedAuthTypes?: (AuthType | string)[];
  supportedSyncDirections?: SyncDirection[];
  supportedSyncFrequencies?: SyncFrequency[];
  supportedMethods?: HttpMethod[];
  capabilities?: string[];
  configSchema?: ConnectorConfigSchema;
  popular?: boolean;
  website?: string;
  docsUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IntegrationInstance {
  id: string;
  organizationId?: string;
  connectorId?: string;
  provider: string;
  name: string;
  displayName?: string;
  category?: ConnectorCategory | string;
  status: IntegrationStatus | string;
  authType: AuthType | string;
  targetModule: string;
  targetEntity?: string;
  apiUrl?: string;
  httpMethod?: HttpMethod;
  syncDirection: SyncDirection;
  syncFrequency: SyncFrequency;
  headers?: Record<string, string> | Array<{ key: string; value: string }>;
  config?: Record<string, any>;
  credentials?: Record<string, any>;
  lastSyncAt?: string;
  lastTestedAt?: string;
  errorCount?: number;
  lastError?: string;
  schemaDiscoveredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIntegrationPayload {
  connectorId?: string;
  provider: string;
  name: string;
  displayName?: string;
  targetModule: string;
  targetEntity?: string;
  apiUrl: string;
  httpMethod: HttpMethod;
  authType: AuthType;
  credentials?: Record<string, any>;
  syncDirection: SyncDirection;
  syncFrequency: SyncFrequency;
  headers?: Record<string, string>;
  config?: Record<string, any>;
}

export interface UpdateIntegrationPayload {
  displayName?: string;
  status?: IntegrationStatus | string;
  syncFrequency?: SyncFrequency;
  syncDirection?: SyncDirection;
  apiUrl?: string;
  httpMethod?: HttpMethod;
  headers?: Record<string, string>;
  config?: Record<string, any>;
  credentials?: Record<string, any>;
}

export interface TestConnectionResponse {
  success: boolean;
  latencyMs?: number;
  message?: string;
  details?: Record<string, any>;
}

export interface OAuthConnectResponse {
  authorizationUrl?: string;
  authUrl?: string;
  url?: string;
  state?: string;
  message?: string;
}

export interface DiscoveredField {
  name: string;
  label?: string;
  type: string;
  nullable?: boolean;
  readOnly?: boolean;
  description?: string;
}

export interface DiscoveredEntity {
  id?: string;
  name: string;
  label?: string;
  description?: string;
  fields: DiscoveredField[];
  supportedOperations?: ("READ" | "WRITE" | "SYNC")[];
}

export interface DiscoveredSchemaResponse {
  entities: DiscoveredEntity[];
  discoveredAt?: string;
  version?: string;
  provider?: string;
}

export interface SyncResponse {
  success: boolean;
  message?: string;
  recordsProcessed?: number;
  syncedAt?: string;
}

export interface ReconnectResponse {
  success: boolean;
  message?: string;
  integration?: IntegrationInstance;
}

export interface StatusToggleResponse {
  success: boolean;
  status: IntegrationStatus;
  message?: string;
}
