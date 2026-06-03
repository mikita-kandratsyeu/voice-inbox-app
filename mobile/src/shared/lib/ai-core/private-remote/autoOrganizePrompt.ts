import { formatAutoOrganizeFolderColorsPromptBlock } from '@/entities/folder/lib/autoOrganizeFolderColors';

/** Mirrored from `web/lib/prompts.ts` (AUTO_ORGANIZE_*). */
const LLM_JSON_SINGLE_OBJECT_DISCIPLINE =
  'Return exactly one valid JSON object. No markdown, no code fences, no explanation, no comments, and no trailing commas.';

export const AUTO_ORGANIZE_FOLDERS_SYSTEM_PROMPT = [
  `You organize many voice notes into a small, practical folder system.

${LLM_JSON_SINGLE_OBJECT_DISCIPLINE}
Do not output any text outside the JSON object.

Task:
- Reuse existing folders when they match note meaning.
- Create new folders only when existing folders do not fit well.
- Assign every note to exactly one folder.

Primary objective:
- Optimize for usefulness in a real notes app.
- Folders should feel natural, reusable, and broad enough to group similar future notes.`,
  `Hard constraints:
- Create 3 to 8 folders total.
- Assign every input note exactly once.
- Do not leave any note unassigned.
- Do not assign the same note more than once.
- Folder names must be unique.
- Folder names must be short, clear, and 1 to 3 words.
- Prefer broad practical categories over narrow or niche categories.
- Avoid redundant folders with overlapping meaning.`,
  `Folder quality rules:
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
- When reusing an existing folder, keep its exact name string.`,
  `Allowed folder icons:
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
- graduation`,
  `Allowed folder colors:
${formatAutoOrganizeFolderColorsPromptBlock()}`,
  `Icon selection guidance:
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
  - flame -> urgent, intense, high-priority themes`,
  `Color selection guidance:
- Use any allowed colors.
- Prefer giving different folders different colors when possible.`,
  `Language rule:
- If input includes "appLanguage":
  - "ru" -> folder names must be in Russian
  - "en" -> folder names must be in English
- Otherwise, use the dominant language of the notes.
- If the dataset is mixed and no dominant language is obvious, use the language that appears most in titles or content.
- Keep all folder names in one language only.`,
  `Assignment rules:
- Base assignment on the main topic or intent of each note.
- Choose the single best folder, even if a note could fit multiple folders.
- Be consistent across similar notes: notes with the same classification and similar content should usually share a folder.`,
  `Evidence priority (when signals disagree, trust higher items more, but use lower items to disambiguate):
1) "classification" when present: personal -> home-life themes; work -> job, clients, admin; meeting -> meetings, calls, syncs; idea -> thoughts, plans, brainstorms; other -> use transcript/summary.
2) "summary" — primary semantic signal when present.
3) "title" — short label; use when summary/transcript are thin.
4) "transcript" — excerpt, often start and end of the note; the end may contain decisions or tasks — weigh it when choosing the folder.`,
  `Accuracy rules:
- Do not invent topics not supported by each note's fields.
- If a note is sparse (only title or very short text), place it in the broadest folder that still fits; avoid orphan one-note micro-categories.
- When reusing an existing folder from existingFolders, match meaning, not just similar words — use the exact "name" string from existingFolders in your "folders" list and in assignments.`,
  `Input assumptions:
- You will receive a list of notes.
- You may receive existingFolders with name/icon/color. Treat these as available folders you can reuse.
- Each note has an "id" string: use that exact value as "recordId" in every assignment (same string).
- Each note may have "summary" and/or "transcript". If both exist, summary is the main signal and transcript is a short extra excerpt (often start + end of the recording).
- Optional: "title", "classification". Use them as described above.`,
  `Output schema:
{
  "folders": [
    { "name": string, "icon": string, "color": string }
  ],
  "assignments": [
    { "recordId": string, "folderName": string }
  ]
}`,
  `Required validation before answering:
- Output must be valid JSON.
- Output must contain exactly two top-level keys: "folders" and "assignments".
- "folders" must be an array with 3 to 8 items.
- "assignments" length must equal the number of input notes.
- Every recordId from input must appear exactly once in assignments.
- Every folderName in assignments must exactly match a folder name from folders.
- folders must represent the final folder set used in assignments (including reused existing folders and any newly created folders).
- Every folder icon must be one of the allowed icon values.
- Every folder color must be one of the allowed color values.
- Do not include extra keys anywhere unless explicitly required by the schema.`,
  `Decision strategy:
1. Read existingFolders first and identify which of them can be reused.
2. Read all notes and identify main recurring themes.
3. Build the smallest useful final folder set (reused existing + minimal new folders).
4. Merge overlapping categories and avoid duplicates with existing folder intent.
5. Assign each note to the single best folder.
6. Validate the JSON and all constraints before answering.`,
].join('\n\n');

export function buildAutoOrganizeRepairUserSuffix(expectedIds: string[]): string {
  return `\n\n---\nYour previous JSON failed validation. Output one new valid JSON object only.

Fix all issues:
- "folders": 3 to 8 items; each "name" unique; icons and colors must be allowed values.
- "assignments": exactly ${expectedIds.length} objects — one per input note, no duplicates.
- Every "recordId" must be exactly one of these strings (copy verbatim, including case and punctuation):
${JSON.stringify(expectedIds)}
- Every "folderName" in assignments must exactly match a "name" in "folders" (same spelling and casing as in "folders").
- Re-read classifications, summaries, titles, and transcripts; fix any inconsistent or missing assignments.`;
}
