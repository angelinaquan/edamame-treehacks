/**
 * Integrations — external service connectors.
 * Each connector syncs data from a third-party service into Supabase.
 * Depends on: core/
 * Independent of: memory/, agents/
 */

// Credentials (shared across all integrations)
export {
  getIntegrationConfig,
  getGoogleDriveCredentials,
  getGoogleOAuthTokens,
  getGitHubToken,
  getGitHubUsername,
  getNotionApiKey,
  getSlackBotToken,
  getActiveCloneId,
  type GoogleDriveCredentials,
  type GoogleOAuthTokens,
} from "./credentials";

// Google Drive + Gmail
export {
  listDriveFiles,
  buildGoogleDriveContext,
  syncGoogleDriveContextToSupabase,
  listGmailMessages,
  syncGmailToSupabase,
  type GoogleDriveFileSnapshot,
  type GoogleDriveContextSnapshot,
  type GoogleDriveSyncResult,
  type GmailMessageSnapshot,
  type GmailSyncResult,
} from "./google";

// Slack
export {
  syncSlackContextToSupabase,
} from "./slack";

// GitHub
export {
  syncGitHubContextToSupabase,
} from "./github";

// Notion
export {
  syncNotionContextToSupabase,
} from "./notion";
