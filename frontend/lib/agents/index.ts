/**
 * Agents — clone brain, collaboration, and LLM communication.
 * Handles AI reasoning, tool calling, and clone-to-clone consultation.
 * Depends on: core/, memory/
 * Independent of: integrations/
 */

// Clone brain (system prompt, reasoning)
export {
  buildSystemPrompt,
  formatMessagesForAPI,
  findRelevantClone,
} from "./clone-brain";

// Clone collaboration
export {
  findCloneByExpertise,
  findCloneByName,
  canConsult,
  consultClone,
} from "./collaboration";

// OpenAI utilities
export { default as getOpenAIClient } from "./openai";
export {
  transcribeAudio,
  synthesizeSpeech,
  generateEmbedding,
} from "./openai";

// Modal backend calls
export {
  callModalEndpoint,
  runCloneBrain,
  embedText,
  transcribeAudioModal,
  synthesizeSpeechModal,
} from "./modal";

// Web search
export {
  searchWeb,
} from "./perplexity";
