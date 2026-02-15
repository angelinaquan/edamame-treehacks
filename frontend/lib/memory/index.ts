/**
 * Memory — organizational knowledge storage and retrieval.
 * Manages documents, chunks, and memories in Supabase.
 * Depends on: core/
 * Independent of: integrations/, agents/
 */

export {
  searchKnowledgeBase,
  getCloneMemories,
  extractFacts,
  saveFact,
} from "./search";

// Mock data (used by agents for demo mode)
export {
  mockPeople,
  mockClones,
  mockMeetings,
  mockDocuments,
  mockSlackMessages,
  mockMemories,
  mockReminders,
  getCloneById,
  getCloneByName,
  getPersonByUserId,
  getMeetingById,
  getActiveReminders,
  getCloneForUser,
} from "./mock-data";
