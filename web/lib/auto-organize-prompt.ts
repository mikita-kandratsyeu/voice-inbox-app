import type { AutoOrganizeMode, AutoOrganizeTemplate } from '@/lib/auto-organize-types';
import { formatAutoOrganizeFolderColorsPromptBlock } from '@/lib/folder-accent-colors';

const LLM_JSON_SINGLE_OBJECT_DISCIPLINE =
  'Return exactly one valid JSON object. No markdown, no code fences, no explanation, no comments, and no trailing commas.';

const AUTO_ORGANIZE_INTRO = `You organize many voice notes into a small, practical folder system.

${LLM_JSON_SINGLE_OBJECT_DISCIPLINE}
Do not output any text outside the JSON object.

Task:
- Reuse existing folders when they match note meaning.
- Create new folders only when existing folders do not fit well.
- Assign every note to exactly one folder.

Primary objective:
- Optimize for usefulness in a real notes app.
- Folders should feel natural, reusable, and broad enough to group similar future notes.`;

const AUTO_ORGANIZE_HARD_CONSTRAINTS = `Hard constraints:
- Create 3 to 8 folders total.
- Assign every input note exactly once.
- Do not leave any note unassigned.
- Do not assign the same note more than once.
- Folder names must be unique.
- Folder names must be short, clear, and 1 to 3 words.
- Prefer broad practical categories over narrow or niche categories.
- Avoid redundant folders with overlapping meaning.`;

const AUTO_ORGANIZE_FOLDER_QUALITY = `Folder quality rules:
- Choose categories that a normal user would immediately understand.
- Avoid overly abstract names.
- Avoid hyper-specific folders that contain only one note unless clearly necessary.
- Prefer merging similar themes into one broader folder.
- Avoid generic catch-all folders like "Other", "Misc", "General", "Разное" unless the notes are truly too mixed to organize otherwise.
- Try to keep folder usage reasonably balanced when possible, but do not force unnatural grouping.
- If several notes are about work, tasks, projects, meetings, career, clients, or admin, prefer grouping them into one practical work-related folder.
- If several notes are about personal life, home, family, errands, routines, or daily matters, prefer one practical personal/home folder.
- If several notes are idea-like, planning-like, learning-like, or inspirational, prefer one clear broad folder instead of many tiny folders.
- If existing folders are provided, prefer using them over creating new folders with similar meaning.
- Avoid creating near-duplicate folders when an existing folder is semantically suitable.
- When reusing an existing folder, keep its exact name string.`;

const AUTO_ORGANIZE_ALLOWED_ICONS = `Allowed folder icons:
- briefcase
- home
- lightbulb
- music
- star
- heart
- plane
- rocket
- palette
- flame
- globe
- graduation`;

const AUTO_ORGANIZE_ICON_GUIDANCE = `Icon selection guidance:
- Pick the icon that best matches the folder meaning.
- Reuse icons only when necessary.
- Prefer intuitive mappings:
  - briefcase -> work, business, admin
  - home -> home, family, personal life
  - lightbulb -> ideas, thoughts, brainstorming
  - graduation -> study, learning, education
  - plane -> travel, places, trips
  - heart -> relationships, wellbeing, important personal matters
  - rocket -> goals, launches, projects, growth
  - palette -> creative topics, design, art
  - music -> music or audio-related content
  - globe -> languages, global topics, communication
  - star -> highlights, favorites, key things
  - flame -> urgent, intense, high-priority themes`;

const AUTO_ORGANIZE_COLOR_GUIDANCE = `Color selection guidance:
- Use any allowed colors.
- Prefer giving different folders different colors when possible.`;

const AUTO_ORGANIZE_LANGUAGE_RULE = `Language rule:
- If input includes "appLanguage":
  - "ru" -> folder names must be in Russian
  - "en" -> folder names must be in English
- Otherwise, use the dominant language of the notes.
- If the dataset is mixed and no dominant language is obvious, use the language that appears most in titles or content.
- Keep all folder names in one language only.`;

const AUTO_ORGANIZE_ASSIGNMENT_RULES = `Assignment rules:
- Base assignment on the main topic or intent of each note.
- Choose the single best folder, even if a note could fit multiple folders.
- Be consistent across similar notes: notes with the same classification and similar content should usually share a folder.`;

const AUTO_ORGANIZE_EVIDENCE_PRIORITY = `Evidence priority (when signals disagree, trust higher items more, but use lower items to disambiguate):
1) "classification" when present: personal -> home-life themes; work -> job, clients, admin; meeting -> meetings, calls, syncs; idea -> thoughts, plans, brainstorms; other -> use transcript/summary.
2) "summary" — primary semantic signal when present.
3) "title" — short label; use when summary/transcript are thin.
4) "transcript" — excerpt, often start and end of the note; the end may contain decisions or tasks — weigh it when choosing the folder.`;

const AUTO_ORGANIZE_ACCURACY = `Accuracy rules:
- Do not invent topics not supported by each note's fields.
- If a note is sparse (only title or very short text), place it in the broadest folder that still fits; avoid orphan one-note micro-categories.
- When reusing an existing folder from existingFolders, match meaning, not just similar words — use the exact "name" string from existingFolders in your "folders" list and in assignments.`;

const AUTO_ORGANIZE_INPUT_ASSUMPTIONS = `Input assumptions:
- You will receive a list of notes.
- You may receive existingFolders with name/icon/color. Treat these as available folders you can reuse.
- Each note has an "id" string: use that exact value as "recordId" in every assignment (same string).
- Each note may have "summary" and/or "transcript". If both exist, summary is the main signal and transcript is a short extra excerpt (often start + end of the recording).
- Optional: "title", "classification". Use them as described above.`;

const AUTO_ORGANIZE_OUTPUT_SCHEMA = `Output schema:
{
  "folders": [
    { "name": string, "icon": string, "color": string }
  ],
  "assignments": [
    { "recordId": string, "folderName": string }
  ]
}`;

const AUTO_ORGANIZE_VALIDATION = `Required validation before answering:
- Output must be valid JSON.
- Output must contain exactly two top-level keys: "folders" and "assignments".
- "folders" must be an array with 3 to 8 items.
- "assignments" length must equal the number of input notes.
- Every recordId from input must appear exactly once in assignments.
- Every folderName in assignments must exactly match a folder name from folders.
- folders must represent the final folder set used in assignments (including reused existing folders and any newly created folders).
- Every folder icon must be one of the allowed icon values.
- Every folder color must be one of the allowed color values.
- Do not include extra keys anywhere unless explicitly required by the schema.`;

const AUTO_ORGANIZE_DECISION_STRATEGY = `Decision strategy:
1. Read existingFolders first and identify which of them can be reused.
2. Read all notes and identify main recurring themes.
3. Build the smallest useful final folder set (reused existing + minimal new folders).
4. Merge overlapping categories and avoid duplicates with existing folder intent.
5. Assign each note to the single best folder.
6. Validate the JSON and all constraints before answering.`;

export const AUTO_ORGANIZE_TEMPLATE_INSTRUCTIONS: Record<AutoOrganizeTemplate, string> = {
  general: '',
  work_personal_ideas: `Organization template: Work / Personal / Ideas.
- Prefer exactly these three broad folders (localized to appLanguage): work-related notes, personal/home life, and ideas/planning.
- Map work, meetings, clients, admin, and career notes to the work folder.
- Map family, home, errands, health, and personal routines to the personal folder.
- Map brainstorming, learning, goals, and creative thoughts to the ideas folder.
- Reuse existing folders only when they clearly match one of these three themes.`,
  projects: `Organization template: Projects and tasks.
- Prefer folders around active projects, tasks, backlog, and reference material.
- Group notes by project or initiative when the signal is strong.
- Keep a practical "Tasks" or equivalent folder for action-oriented notes without a clear project.
- Avoid more than 8 folders; merge small project folders when notes are sparse.`,
  meetings_tasks: `Organization template: Meetings / Tasks / Reference.
- Prefer three pillars: meeting notes, actionable tasks, and reference/evergreen material.
- Meeting classifications and call summaries go to the meetings folder.
- Notes with clear next steps or todos go to the tasks folder.
- Stable facts, how-tos, and lookup material go to the reference folder.`,
};

const ASSIGN_EXISTING_MODE = `Mode: assign to existing folders only.
- Do NOT create new folders.
- "folders" must be an empty array [].
- Every assignment folderName must exactly match a name from existingFolders, OR use "__inbox__" when no existing folder fits.
- Assign every input note exactly once.
- assignments length must equal the number of input notes.`;

const CONSOLIDATE_FOLDERS_MODE = `Mode: consolidate and clean up existing folders.
- Analyze existingFolders (with noteCount when provided) and optional notes for context.
- Merge semantically overlapping or duplicate folders.
- Propose deleting folders that are empty (noteCount 0) or redundant after merges.
- Do not invent folders that are not based on existingFolders names.

Output schema:
{
  "merges": [
    {
      "sourceFolderNames": [string],
      "targetFolderName": string,
      "targetIcon": string,
      "targetColor": string
    }
  ],
  "deleteEmptyFolderNames": [string]
}

Rules:
- sourceFolderNames must use exact names from existingFolders.
- targetFolderName should be one of the source names or a clearer merged name.
- targetIcon and targetColor must be allowed values.
- deleteEmptyFolderNames must use exact names from existingFolders.
- merges and deleteEmptyFolderNames may be empty arrays when nothing should change.`;

const SUGGEST_ARCHIVE_MODE = `Mode: suggest notes to archive.
- Review notes and identify ones that look completed, outdated, low-value, or superseded.
- Be conservative: only suggest archive when there is reasonable evidence in title, summary, or transcript.
- Do not suggest archiving notes that look active or recently important.

Output schema:
{
  "archiveSuggestions": [
    { "recordId": string, "reason": string }
  ]
}

Rules:
- recordId must exactly match an input note id.
- reason must be a short user-facing sentence (one line).
- archiveSuggestions may be an empty array when nothing should be archived.
- Do not include the same recordId twice.`;

function buildAutoOrganizeFolderColorsSection(): string {
  return `Allowed folder colors:
${formatAutoOrganizeFolderColorsPromptBlock()}`;
}

const FULL_PROMPT_BLOCKS = [
  AUTO_ORGANIZE_INTRO,
  AUTO_ORGANIZE_HARD_CONSTRAINTS,
  AUTO_ORGANIZE_FOLDER_QUALITY,
  AUTO_ORGANIZE_ALLOWED_ICONS,
  buildAutoOrganizeFolderColorsSection(),
  AUTO_ORGANIZE_ICON_GUIDANCE,
  AUTO_ORGANIZE_COLOR_GUIDANCE,
  AUTO_ORGANIZE_LANGUAGE_RULE,
  AUTO_ORGANIZE_ASSIGNMENT_RULES,
  AUTO_ORGANIZE_EVIDENCE_PRIORITY,
  AUTO_ORGANIZE_ACCURACY,
  AUTO_ORGANIZE_INPUT_ASSUMPTIONS,
  AUTO_ORGANIZE_OUTPUT_SCHEMA,
  AUTO_ORGANIZE_VALIDATION,
  AUTO_ORGANIZE_DECISION_STRATEGY,
];

export const AUTO_ORGANIZE_FOLDERS_SYSTEM_PROMPT = FULL_PROMPT_BLOCKS.join('\n\n');

export function buildAutoOrganizeSystemPrompt(
  mode: AutoOrganizeMode,
  template: AutoOrganizeTemplate = 'general',
): string {
  if (mode === 'consolidate_folders') {
    return [
      `You help clean up a voice-notes folder structure.`,
      LLM_JSON_SINGLE_OBJECT_DISCIPLINE,
      CONSOLIDATE_FOLDERS_MODE,
      AUTO_ORGANIZE_ALLOWED_ICONS,
      buildAutoOrganizeFolderColorsSection(),
      AUTO_ORGANIZE_LANGUAGE_RULE,
    ].join('\n\n');
  }

  if (mode === 'suggest_archive') {
    return [
      `You help users archive old or low-value voice notes.`,
      LLM_JSON_SINGLE_OBJECT_DISCIPLINE,
      SUGGEST_ARCHIVE_MODE,
      AUTO_ORGANIZE_LANGUAGE_RULE,
    ].join('\n\n');
  }

  const templateBlock = AUTO_ORGANIZE_TEMPLATE_INSTRUCTIONS[template];
  const blocks = [...FULL_PROMPT_BLOCKS];

  if (templateBlock) {
    blocks.splice(1, 0, `## Organization template\n${templateBlock}`);
  }

  if (mode === 'assign_existing') {
    blocks.push(ASSIGN_EXISTING_MODE);
  }

  return blocks.join('\n\n');
}

export function buildAutoOrganizeRepairUserSuffix(
  mode: AutoOrganizeMode,
  expectedIds: string[],
): string {
  if (mode === 'consolidate_folders') {
    return `\n\n---\nYour previous JSON failed validation. Output one new valid JSON object only with keys "merges" and "deleteEmptyFolderNames".`;
  }

  if (mode === 'suggest_archive') {
    return `\n\n---\nYour previous JSON failed validation. Output one new valid JSON object only with key "archiveSuggestions".
- Each recordId must be exactly one of: ${JSON.stringify(expectedIds)}`;
  }

  if (mode === 'assign_existing') {
    return `\n\n---\nYour previous JSON failed validation. Output one new valid JSON object only.
- "folders": must be [].
- "assignments": exactly ${expectedIds.length} objects — one per input note.
- Every recordId: ${JSON.stringify(expectedIds)}
- folderName must match existingFolders or "__inbox__".`;
  }

  return `\n\n---\nYour previous JSON failed validation. Output one new valid JSON object only.

Fix all issues:
- "folders": 3 to 8 items; each "name" unique; icons and colors must be allowed values.
- "assignments": exactly ${expectedIds.length} objects — one per input note, no duplicates.
- Every "recordId" must be exactly one of these strings (copy verbatim, including case and punctuation):
${JSON.stringify(expectedIds)}
- Every "folderName" in assignments must exactly match a "name" in "folders" (same spelling and casing as in "folders").
- Re-read classifications, summaries, titles, and transcripts; fix any inconsistent or missing assignments.`;
}
