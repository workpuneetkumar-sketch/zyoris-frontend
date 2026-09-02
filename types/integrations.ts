export type IntegrationProvider =
  | "HUBSPOT"
  | "SALESFORCE"
  | "ZOHO"
  | "SHOPIFY"
  | "STRIPE"
  | "RAZORPAY"
  | "GOOGLE_WORKSPACE"
  | "META_WHATSAPP"
  | "SLACK"
  | "CUSTOM_WEBHOOK"
  | "CUSTOM_API"
  | (string & {});

export type ConnectorCategory =
  | "CRM"
  | "FINANCE"
  | "MARKETING"
  | "COMMUNICATION"
  | "COMMUNICATIONS"
  | "ERP"
  | "ACCOUNTING"
  | "ECOMMERCE"
  | "PAYMENT"
  | "STORAGE"
  | "HR"
  | "PROJECTS"
  | "CUSTOM"
  | (string & {});

export type AuthType =
  | "OAUTH2"
  | "API_KEY"
  | "BEARER_TOKEN"
  | "BASIC_AUTH"
  | "WEBHOOK_SECRET"
  | "CUSTOM"
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
  | "INACTIVE"
  | "PENDING_AUTH"
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

export interface ConnectorPermissions {
  canConnect?: boolean;
  canConfigure?: boolean;
  canDisconnect?: boolean;
}

export interface Connector {
  id: string;
  provider: IntegrationProvider | string;
  name: string;
  description: string;
  category: ConnectorCategory | string;
  icon?: string;
  iconUrl?: string;
  logo?: string;
  logoUrl?: string;
  version?: string;
  status?: IntegrationStatus | string;
  isConnected?: boolean;
  available?: boolean;
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
  permissions?: ConnectorPermissions;
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
  provider: IntegrationProvider | string;
  name: string;
  displayName?: string;
  category?: ConnectorCategory | string;
  status: IntegrationStatus | string;
  authType?: AuthType | string;
  isEnabled?: boolean;
  targetModule?: string;
  targetEntity?: string;
  apiUrl?: string;
  baseUrl?: string;
  httpMethod?: HttpMethod;
  syncDirection?: SyncDirection;
  syncFrequency?: SyncFrequency;
  headers?: Record<string, string> | Array<{ key: string; value: string }>;
  config?: Record<string, any>;
  credentials?: Record<string, any>;
  lastSyncedAt?: string | null;
  lastSyncAt?: string;
  lastTestedAt?: string;
  errorCount?: number;
  lastError?: string;
  schemaDiscoveredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIntegrationPayload {
  provider: string;
  name: string;
  authType?: AuthType | string;
  apiKey?: string;
  apiSecret?: string;
  webhookSecret?: string;
  password?: string;
  customSecrets?: Record<string, any>;
  baseUrl?: string;
  config?: Record<string, any>;
  redirectUri?: string;
  // Additional client helper fields
  connectorId?: string;
  displayName?: string;
  targetModule?: string;
  targetEntity?: string;
  apiUrl?: string;
  httpMethod?: HttpMethod;
  credentials?: Record<string, any>;
  syncDirection?: SyncDirection;
  syncFrequency?: SyncFrequency;
  headers?: Record<string, string>;
}

export interface UpdateIntegrationPayload {
  name?: string;
  displayName?: string;
  isEnabled?: boolean;
  status?: IntegrationStatus | string;
  config?: Record<string, any>;
  apiKey?: string;
  apiSecret?: string;
  webhookSecret?: string;
  password?: string;
  customSecrets?: Record<string, any>;
  syncFrequency?: SyncFrequency;
  syncDirection?: SyncDirection;
  apiUrl?: string;
  httpMethod?: HttpMethod;
  headers?: Record<string, string>;
  credentials?: Record<string, any>;
}

export interface TestConnectionDiagnostics {
  provider?: string;
  connector?: string;
  httpStatus?: number | null;
  responseTimeMs?: number;
  recordCount?: number | null;
}

export interface TestConnectionError {
  category?:
    | "AUTHENTICATION"
    | "AUTH"
    | "TIMEOUT"
    | "NETWORK"
    | "RATE_LIMIT"
    | "CONFIGURATION"
    | "CONFIG"
    | "UNKNOWN"
    | "SERVER";
  code?: string;
  message?: string;
  retryable?: boolean;
  retryAfterSeconds?: number | null;
}

export interface TestConnectionResponse {
  success: boolean;
  integrationId?: string;
  provider?: string;
  status?: "connected" | "failed" | "unsupported" | string;
  httpStatus?: number | null;
  statusCode?: number;
  responseTimeMs?: number;
  latencyMs?: number;
  responseTime?: number;
  recordCount?: number | null;
  recordsDetected?: number;
  detectedRecords?: number;
  recordsCount?: number;
  entitiesDetected?: number;
  entitiesCount?: number;
  diagnostics?: TestConnectionDiagnostics | string;
  error?: TestConnectionError;
  message?: string;
  details?: Record<string, any>;
  testedAt?: string;
  timestamp?: string;
  [key: string]: any;
}

export type ConnectionErrorCategory =
  | "AUTH"
  | "TIMEOUT"
  | "NETWORK"
  | "RATE_LIMIT"
  | "CONFIG"
  | "SERVER"
  | "UNKNOWN";

export interface NormalizedConnectionTestResult {
  success: boolean;
  statusCode?: number;
  latencyMs?: number;
  message?: string;
  diagnostics?: string;
  recordsDetected?: number;
  entitiesDetected?: number;
  testedAt?: string;
  errorCategory?: ConnectionErrorCategory;
  retryable?: boolean;
  retryAfterSeconds?: number | null;
}

export interface OAuthConnectResponse {
  authorizationUrl?: string;
  authUrl?: string;
  url?: string;
  redirectUrl?: string;
  state?: string;
  message?: string;
  [key: string]: any;
}

export interface DiscoveredPagination {
  page?: number;
  limit?: number;
  pageSize?: number | null;
  total?: number | null;
  totalRecords?: number | null;
  totalPages?: number;
  hasNext?: boolean;
  hasMore?: boolean;
  nextCursor?: string | null;
  [key: string]: any;
}

export interface DiscoveredField {
  name?: string;
  path?: string;
  nestedPath?: string;
  label?: string;
  type: string;
  required?: boolean;
  nullable?: boolean;
  readOnly?: boolean;
  description?: string;
  sampleValue?: any;
  sample?: any;
  example?: any;
  fields?: DiscoveredField[];
  children?: DiscoveredField[];
  properties?: Record<string, DiscoveredField>;
  [key: string]: any;
}

export interface DiscoveredEntity {
  id?: string;
  name: string;
  label?: string;
  description?: string;
  fields: DiscoveredField[];
  supportedOperations?: ("READ" | "WRITE" | "SYNC")[];
  recordCount?: number | null;
  totalRecords?: number | null;
  sampleRecords?: Record<string, any>[];
  sampleData?: Record<string, any>[];
  records?: Record<string, any>[];
  pagination?: DiscoveredPagination | null;
  [key: string]: any;
}

export interface DiscoveredSchemaResponse {
  success?: boolean;
  integrationId?: string;
  provider?: string;
  fields?: DiscoveredField[];
  entities: DiscoveredEntity[];
  discoveredAt?: string;
  sampledAt?: string;
  version?: string;
  recordCount?: number | null;
  totalRecords?: number | null;
  pagination?: DiscoveredPagination | null;
  sampleRecords?: Record<string, any>[];
  sampleData?: Record<string, any>[];
  rawSchema?: any;
  [key: string]: any;
}

export interface SyncResponse {
  success: boolean;
  message?: string;
  recordsProcessed?: number;
  syncedAt?: string;
  data?: Record<string, any>;
}

export interface RotateCredentialsPayload {
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  webhookSecret?: string;
  clientSecret?: string;
  password?: string;
  customSecrets?: Record<string, any>;
  tokenExpiresAt?: string;
}

export interface RotateCredentialsResponse {
  success: boolean;
  integrationId: string;
  message: string;
  rotatedAt: string;
}

export interface ReconnectPayload {
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  webhookSecret?: string;
  clientSecret?: string;
  password?: string;
  customSecrets?: Record<string, any>;
  baseUrl?: string;
  config?: Record<string, any>;
  redirectUri?: string;
}

export interface ReconnectResponse {
  success: boolean;
  message?: string;
  integration?: IntegrationInstance;
  authorizationUrl?: string;
  authUrl?: string;
}

export interface StatusToggleResponse {
  success: boolean;
  status: IntegrationStatus;
  message?: string;
}

export interface FieldMapping {
  id?: string;
  sourceField: string;
  targetField: string;
  transformation?: string | MappingTransformation;
  defaultValue?: any;
  required?: boolean;
  sourceType?: string;
  targetType?: string;
  description?: string;
  [key: string]: any;
}

export interface SchemaMappingPayload {
  integrationId?: string;
  mappings: FieldMapping[];
  targetModule?: string;
  targetEntity?: string;
  version?: string;
  [key: string]: any;
}

export interface SchemaMappingResponse {
  success?: boolean;
  integrationId?: string;
  mappings: FieldMapping[];
  targetModule?: string;
  targetEntity?: string;
  updatedAt?: string;
  createdAt?: string;
  [key: string]: any;
}

export interface DiscoverSchemaPayload {
  samplePayload?: Record<string, any> | any[];
  targetEntity?: string;
  targetModule?: string;
  [key: string]: any;
}

export type MappingStatus = "ACTIVE" | "INACTIVE" | "PENDING" | "ERROR";

export type TransformationRuleType =
  | "none"
  | "UPPERCASE"
  | "LOWERCASE"
  | "TRIM"
  | "PARSE_DATE"
  | "DEFAULT_VALUE"
  | "REGEX_REPLACE"
  | (string & {});

export interface MappingTransformation {
  type: TransformationRuleType;
  config?: Record<string, any>;
  defaultValue?: any;
}

export interface IntegrationMapping {
  id: string;
  integrationId: string;
  organizationId: string;
  sourceEntity: string;
  sourceField: string;
  targetEntity: string;
  targetField: string;
  status: MappingStatus;
  confidence: number;
  required: boolean;
  transformation: MappingTransformation;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMappingRequest {
  sourceEntity: string;
  sourceField: string;
  targetEntity: string;
  targetField: string;
  status?: MappingStatus;
  confidence?: number;
  required?: boolean;
  transformation?: MappingTransformation;
}

export interface UpdateMappingRequest {
  sourceEntity?: string;
  sourceField?: string;
  targetEntity?: string;
  targetField?: string;
  status?: MappingStatus;
  confidence?: number;
  required?: boolean;
  transformation?: MappingTransformation;
}

export interface MappingListResponse {
  mappings: IntegrationMapping[];
  total: number;
}

export interface TransformationRuleItem {
  type: TransformationRuleType;
  params?: Record<string, any>;
}

export interface PreviewTransformationPayload {
  sampleValue: string;
  rules: TransformationRuleItem[];
}

export interface TransformationStepTrace {
  ruleIndex: number;
  ruleType: string;
  output: string;
  success: boolean;
  error?: string | null;
}

export interface PreviewTransformationResponse {
  success: boolean;
  data: {
    originalValue: string;
    transformedValue: string;
    steps: TransformationStepTrace[];
    appliedRulesCount: number;
  };
}

export interface TargetFieldDefinition {
  key: string;
  name?: string;
  label: string;
  type?: string;
  dataType?: string;
  required?: boolean;
  nullable?: boolean;
  readOnly?: boolean;
  description?: string;
  options?: ConnectorFieldOption[];
  defaultValue?: any;
  example?: any;
}

export interface TargetEntityDefinition {
  id: string;
  name: string;
  label: string;
  description?: string;
  targetFields: TargetFieldDefinition[];
  supportedOperations?: ("READ" | "WRITE" | "SYNC")[];
}

export interface TargetModuleDefinition {
  id: string;
  label: string;
  name?: string;
  description?: string;
  entities: TargetEntityDefinition[];
}

export type WebhookProvider =
  | "CRM"
  | "FACEBOOK"
  | "GOOGLE"
  | "WEBSITE"
  | "FINANCE"
  | "PAYMENTS"
  | "INVOICE"
  | "HR"
  | "ATTENDANCE"
  | "EMPLOYEE"
  | "LEAVE"
  | "PROJECT"
  | "TASK"
  | "MEETING"
  | "MARKETING"
  | "COMMUNICATION"
  | "NOTIFICATION"
  | "DASHBOARD"
  | "ANALYTICS"
  | "INSIGHTS"
  | (string & {});

export interface WebhookEventMetadata {
  organizationId?: string;
  externalId?: string;
  requestId?: string;
  timestamp?: string;
  [key: string]: any;
}

export interface WebhookIngressPayload {
  source: string;
  event: string;
  payload: Record<string, any>;
  metadata?: WebhookEventMetadata;
}

export interface WebhookIngressResponse {
  success: boolean;
  requestId?: string;
  message: string;
  data?: any;
}

export interface WebhookValidationErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export interface WebhookErrorResponse {
  success: false;
  error: string;
  message: string;
  requestId?: string;
  details?: WebhookValidationErrorDetail[];
}

export interface WorkspaceMappingState {
  sourceEntity: string;
  targetModule: string;
  targetEntity: string;
  mappings: Record<string, {
    sourceField: string;
    sourceType?: string;
    targetField: string;
    targetType?: string;
    transformation?: MappingTransformation;
    skipped?: boolean;
    required?: boolean;
    isCustom?: boolean;
  }>;
  isDirty: boolean;
  lastSavedAt?: string;
}

// ---------------------------------------------------------------------------
// Day 7: Pre-Flight Test Connection & Monitoring Audit Logs / Errors / Stats
// ---------------------------------------------------------------------------

export interface PreflightTestPayload {
  provider: string;
  authType?: string;
  credentials: Record<string, any>;
  config?: Record<string, any>;
}

export interface PreflightTestResponse {
  success: boolean;
  status?: "CONNECTED" | "FAILED" | "PENDING";
  latencyMs?: number;
  message?: string;
  details?: {
    reachable?: boolean;
    authValid?: boolean;
    scopesGranted?: string[];
    apiVersion?: string;
    [key: string]: any;
  };
  error?: string;
  data?: any;
}

export interface SyncLogItem {
  id: string;
  integrationId: string;
  integrationName?: string;
  provider?: string;
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED" | "PARTIAL_SUCCESS" | "CANCELLED" | string;
  direction: "INBOUND" | "OUTBOUND" | "BIDIRECTIONAL" | string;
  trigger: "SCHEDULED" | "MANUAL" | "WEBHOOK" | "SYSTEM" | string;
  entityType?: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  recordsProcessed?: number;
  successfulRecords?: number;
  failedRecords?: number;
  errorMessage?: string;
  createdAt?: string;
}

export interface SyncLogsQuery {
  page?: number;
  limit?: number;
  integrationId?: string;
  status?: string;
  direction?: string;
  trigger?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
}

export interface SyncLogsResponse {
  success: boolean;
  data: SyncLogItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SyncErrorItem {
  id: string;
  syncRunId?: string;
  integrationId?: string;
  integrationName?: string;
  entityType?: string;
  errorCode?: string;
  errorMessage: string;
  errorStack?: string;
  rawPayload?: Record<string, any>;
  retryable: boolean;
  retryCount: number;
  resolved: boolean;
  resolvedAt?: string;
  createdAt: string;
  updatedAt?: string;
  syncRun?: {
    id: string;
    entityType: string;
    status: string;
    integrationId: string;
  };
}

export interface SyncErrorsQuery {
  page?: number;
  limit?: number;
  syncRunId?: string;
  integrationId?: string;
  errorCode?: string;
  entityType?: string;
  resolved?: boolean;
  retryable?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface SyncErrorsResponse {
  success: boolean;
  data: SyncErrorItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface IntegrationMonitoringStats {
  totalRuns: number;
  totalSuccessful: number;
  totalFailed: number;
  totalPartialSuccess: number;
  totalRunning: number;
  totalPending: number;
  totalCancelled: number;
  totalErrors: number;
  unresolvedErrors: number;
  activeIntegrations: number;
  totalRecordsSynced: number;
  totalRecordsFailed: number;
  failureRate: number | null;
  lastSyncAt: string | null;
}

export interface IntegrationMonitoringStatsResponse {
  success: boolean;
  data: IntegrationMonitoringStats;
}


