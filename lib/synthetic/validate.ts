import type { MemoryResourceInput } from "../types";

const SOURCE_REQUIRED_METADATA: Record<string, string[]> = {
  slack: ["channel_id", "sender_id"],
  notion: ["page_id", "workspace_id", "last_edited_by", "path"],
  github: ["repo", "commit_sha", "author", "files_changed"],
};

export interface SyntheticValidationResult {
  valid: boolean;
  errors: string[];
}

function isIso(value: string): boolean {
  return !Number.isNaN(new Date(value).getTime());
}

export function validateSyntheticResources(
  resources: MemoryResourceInput[]
): SyntheticValidationResult {
  const errors: string[] = [];

  resources.forEach((resource, index) => {
    if (!resource.clone_id) {
      errors.push(`resources[${index}].clone_id is required.`);
    }
    if (!resource.source_type) {
      errors.push(`resources[${index}].source_type is required.`);
    }
    if (!resource.external_id) {
      errors.push(`resources[${index}].external_id is required.`);
    }
    if (!resource.content || resource.content.trim().length < 20) {
      errors.push(`resources[${index}].content is missing or too short.`);
    }
    if (!resource.occurred_at || !isIso(resource.occurred_at)) {
      errors.push(`resources[${index}].occurred_at must be a valid ISO date.`);
    }
    if (!resource.modality) {
      errors.push(`resources[${index}].modality is required.`);
    }

    const requiredMetadata =
      SOURCE_REQUIRED_METADATA[resource.source_type] || [];
    const metadata = resource.source_metadata as Record<string, unknown>;
    requiredMetadata.forEach((field) => {
      if (
        metadata[field] === undefined ||
        metadata[field] === null ||
        metadata[field] === ""
      ) {
        errors.push(
          `resources[${index}].source_metadata.${field} is required for source ${resource.source_type}.`
        );
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
