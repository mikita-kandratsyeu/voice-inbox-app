import { formatAutoOrganizeFolderColorsPromptBlock } from '@/entities/folder/lib/autoOrganizeFolderColors';
import type {
  AutoOrganizeMode,
  AutoOrganizeTemplate,
} from '@/entities/folder/lib/autoOrganizeTypes';

/** Mirrored from `web/lib/auto-organize-prompt.ts`. */
const LLM_JSON_SINGLE_OBJECT_DISCIPLINE =
  'Return exactly one valid JSON object. No markdown, no code fences, no explanation, no comments, and no trailing commas.';

const AUTO_ORGANIZE_INTRO = `You are an expert at organizing voice notes into an intuitive, practical folder structure.

${LLM_JSON_SINGLE_OBJECT_DISCIPLINE}
Do not output any text outside the JSON object.

Your goal:
Create a folder system that makes notes easy to find and manage in real-world usage.

Core principles:
1. Reuse existing folders whenever their meaning aligns with note content
2. Create new folders only when existing ones genuinely don't fit
3. Assign every note to exactly one folder
4. Design folders to be reusable for similar future notes
5. Optimize for practical usefulness, not theoretical perfection`;

const AUTO_ORGANIZE_HARD_CONSTRAINTS = `Hard constraints (must be satisfied):
- Total folders: exactly 3 to 8 folders
- Note assignment: every input note assigned exactly once (no duplicates, no omissions)
- Folder names: unique, clear, 1-3 words maximum
- Category breadth: prefer broad, practical categories over narrow, niche ones
- No redundancy: avoid folders with overlapping or duplicate meanings`;

const AUTO_ORGANIZE_FOLDER_QUALITY = `Folder quality guidelines:

Clarity and usability:
- Use categories that users instantly understand
- Avoid abstract, vague, or overly technical names
- Avoid hyper-specific single-note folders unless truly necessary
- Merge similar themes into broader, more useful folders
- Balance folder distribution naturally (don't force artificial grouping)

Avoid generic catch-alls:
- Don't use "Other", "Misc", "General", "Разное" unless notes are genuinely too diverse to organize
- These should be the last resort, not the default

Smart grouping patterns:
- Work-related (tasks, projects, meetings, career, clients, admin) → one practical work folder
- Personal life (home, family, errands, routines, daily matters) → one practical personal/home folder
- Ideas (planning, learning, brainstorming, inspiration) → one clear broad folder

Reusing existing folders:
- Strongly prefer existing folders over creating similar new ones
- Avoid near-duplicate folders when existing folder is semantically suitable
- When reusing: preserve the exact name string from existingFolders`;

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

Selection principles:
- Choose icon that best represents folder meaning
- Prefer variety: use different icons for different folders when possible
- Use intuitive, obvious mappings over creative interpretations

Icon meanings (use these associations):
- briefcase → work, business, professional, admin, career
- home → home, family, personal life, household, domestic
- lightbulb → ideas, thoughts, brainstorming, inspiration, creativity
- graduation → study, learning, education, courses, training
- plane → travel, places, trips, destinations, geography
- heart → relationships, wellbeing, important personal matters, health
- rocket → goals, launches, projects, growth, ambition, startups
- palette → creative work, design, art, visual projects
- music → music, audio, entertainment, media
- globe → languages, international, global topics, communication
- star → highlights, favorites, important items, priorities
- flame → urgent, intense, high-energy, critical priority

When multiple icons fit:
- Choose the most specific and recognizable
- Consider folder's primary purpose, not secondary attributes`;

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

const AUTO_ORGANIZE_ASSIGNMENT_RULES = `Note assignment rules:

Primary principle:
- Assign based on the main topic or primary intent of each note
- Choose the single best folder even when multiple could fit

Handling ambiguity:
- When a note could fit 2+ folders: use the evidence priority ranking
- Prefer the folder that captures the note's core purpose
- Don't overthink edge cases: pick the most intuitive choice

Consistency across notes:
- Notes with same classification and similar content should usually share a folder
- Create predictable patterns (e.g., all work meetings → Work folder)
- User should be able to predict where similar notes will land`;

const AUTO_ORGANIZE_EVIDENCE_PRIORITY = `Evidence priority (ranked by reliability - trust higher items more when signals conflict):

1. Classification (highest priority when present):
   - "personal" → home-life, family, personal matters
   - "work" → job, clients, admin, professional tasks
   - "meeting" → meetings, calls, syncs, discussions
   - "idea" → thoughts, plans, brainstorming, concepts
   - "other" → rely on summary/transcript

2. Summary (primary semantic signal):
   - Most reliable indicator of note content when present
   - Use as main decision factor for folder assignment

3. Title (useful for quick categorization):
   - Short label that captures core topic
   - Especially valuable when summary/transcript are sparse

4. Transcript (detailed context):
   - Often contains start and end excerpts
   - End portion may contain key decisions or action items
   - Weight heavily when making ambiguous folder choices

Use lower-priority items to disambiguate or confirm when higher signals are unclear.`;

const AUTO_ORGANIZE_ACCURACY = `Accuracy and grounding rules:

Content fidelity:
- Never invent topics not supported by note fields
- Base all folder assignments on actual note content
- Don't make assumptions beyond what's explicitly stated

Handling sparse notes:
- For notes with minimal content (only title or very short text):
  - Place in the broadest appropriate folder
  - Avoid creating orphan single-note micro-categories
  - Better to group conservatively than create unnecessary folders

Reusing existing folders:
- Match by meaning and semantic intent, not just word similarity
- When reusing: copy the exact "name" string from existingFolders
- Use this exact string in both "folders" list and "assignments"`;

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

const AUTO_ORGANIZE_VALIDATION = `Pre-output validation checklist (verify ALL before responding):

JSON structure:
✓ Valid JSON that passes JSON.parse()
✓ Exactly two top-level keys: "folders" and "assignments"
✓ No extra keys beyond schema

Folders array:
✓ Length: 3 to 8 items exactly
✓ All folder names are unique
✓ All icons are from allowed list
✓ All colors are from allowed list
✓ Includes all reused existing folders referenced in assignments
✓ Includes all newly created folders

Assignments array:
✓ Length equals total number of input notes
✓ Every input note recordId appears exactly once (no duplicates, no omissions)
✓ Every folderName exactly matches a name from folders array (case-sensitive)
✓ No recordId appears twice

Cross-validation:
✓ Every folder in folders array is used by at least one assignment
✓ No orphan folders (folders with zero assignments)
✓ Folder names in assignments use exact spelling from folders array`;

const AUTO_ORGANIZE_DECISION_STRATEGY = `Decision-making process (follow in order):

Step 1 - Analyze existing structure:
- Review all existingFolders provided
- Identify which can be reused based on semantic fit
- Note their icons, colors, and intended purposes

Step 2 - Identify themes:
- Read through all notes to understand content
- Identify main recurring topics and patterns
- Group conceptually similar notes mentally

Step 3 - Build minimal folder set:
- Start with reusable existing folders
- Add only essential new folders where gaps exist
- Aim for smallest useful set (prefer 3-5, max 8)
- Merge overlapping categories aggressively

Step 4 - Assign notes:
- Match each note to its single best folder
- Use evidence priority ranking for ambiguous cases
- Ensure every note is assigned exactly once

Step 5 - Validate before output:
- Check JSON validity and schema compliance
- Verify all hard constraints are met
- Confirm folder count (3-8), name uniqueness, complete assignments
- Review language consistency`;

export const AUTO_ORGANIZE_TEMPLATE_INSTRUCTIONS: Record<AutoOrganizeTemplate, string> = {
  general: '',
  work_personal_ideas: `Organization template: Work / Personal / Ideas

Template goal:
Create exactly three broad, balanced folders covering all notes.

Folder definitions (localize names to appLanguage):
1. Work folder:
   - Work tasks, meetings, clients, admin, career
   - Professional projects and business matters

2. Personal folder:
   - Family, home, errands, health, daily routines
   - Personal life, relationships, household matters

3. Ideas folder:
   - Brainstorming, learning, goals, creative thoughts
   - Planning, concepts, future projects, inspiration

Assignment rules:
- Map notes to the most appropriate of these three categories
- Reuse existing folders ONLY if they clearly match one of these three themes
- Create new folders if existing ones don't fit this triadic structure`,

  projects: `Organization template: Projects and tasks

Template goal:
Organize around active projects and actionable work.

Folder strategy:
- Group notes by project or initiative when signal is clear and strong
- Create one practical "Tasks" folder (or localized equivalent) for actionable notes without clear project association
- Include "Backlog" or "Reference" folder for supporting material
- Prioritize active projects over archived/inactive ones

Constraints:
- Maximum 8 folders total
- Merge small project folders when notes are sparse (< 3 notes per folder)
- Focus on current, active work rather than historical categorization`,

  meetings_tasks: `Organization template: Meetings / Tasks / Reference

Template goal:
Separate meeting notes, actionable items, and reference material into three clear pillars.

Folder definitions (localize to appLanguage):
1. Meetings folder:
   - Meeting notes, call summaries, sync recaps
   - Interview notes, discussion captures
   - Use "meeting" classification as primary signal

2. Tasks folder:
   - Action-oriented notes with clear next steps
   - Todos, assignments, work items
   - Notes with task extraction or explicit action items

3. Reference folder:
   - Stable facts, how-tos, documentation
   - Lookup material, evergreen content
   - Knowledge base items without time-bound actions

Assignment priority:
- Meeting classification → Meetings folder
- Has tasks or action items → Tasks folder
- Informational/stable content → Reference folder`,
};

const ASSIGN_EXISTING_MODE = `Mode: assign to existing folders only.
- Do NOT create new folders.
- "folders" must be an empty array [].
- Every assignment folderName must exactly match a name from existingFolders, OR use "__inbox__" when no existing folder fits.
- Assign every input note exactly once.
- assignments length must equal the number of input notes.`;

const CONSOLIDATE_FOLDERS_MODE = `Mode: consolidate and clean up existing folders.

Your task:
Analyze the folder structure and suggest improvements through merges and deletions.

Analysis approach:
- Review existingFolders with noteCount (when provided)
- Consider note content for context (when provided)
- Identify semantically overlapping or duplicate folders
- Find empty (noteCount: 0) or redundant folders
- Never invent folders not based on existingFolders

Merge criteria:
- Folders with overlapping meaning (e.g., "Work Tasks" + "Job Projects")
- Near-duplicate categories that should be unified
- Small folders with related themes that make more sense combined

Deletion criteria:
- Empty folders (noteCount: 0)
- Folders made redundant after merges

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

Output rules:
- sourceFolderNames: exact names from existingFolders (2+ folders to merge)
- targetFolderName: either one of the source names OR clearer merged name
- targetIcon, targetColor: must be allowed values
- deleteEmptyFolderNames: exact names from existingFolders
- Both arrays may be empty [] when no changes needed
- Return empty arrays rather than forcing unnecessary changes`;

const AUTO_ORGANIZE_ARCHIVE_LANGUAGE_RULE = `Language rule:
- If input includes "appLanguage":
  - "ru" -> every "reason" must be in Russian
  - "en" -> every "reason" must be in English
- Otherwise, use the dominant language of the notes.`;

const SUGGEST_ARCHIVE_MODE = `Mode: suggest notes to archive.
This mode does NOT organize folders. Do NOT output "folders" or "assignments".

Your mission:
Help users declutter their inbox by identifying notes that are safe to archive.
- Archiving hides notes from active view while keeping them recoverable
- CRITICAL: A wrong suggestion is worse than missing one — prefer caution over completeness
- Better to archive nothing than to archive something important

HARD EXCLUSIONS (NEVER archive if ANY apply):

Active work indicators:
- "isPinned": true (user explicitly marked as important)
- "openTaskCount" > 0 or "openTasks" is non-empty array
- "taskCount" > 0 but "allTasksDone" is not true
- Content contains unfinished work signals:
  - English: "todo", "need to", "should", "must", "follow up", "remind", "deadline", "action item"
  - Russian: "задача", "нужно", "сделать", "напомнить", "дедлайн", "надо"
- Open questions that still need answers
- Active project, plan, or shopping/errand list not yet completed
- Upcoming event or future commitment

STRONG ARCHIVE CANDIDATES (only when NO exclusions apply):

Completed work:
- One-off errands clearly finished with no open work remaining
- Past meetings/calls with outcomes captured and no follow-ups
- Time-bound notes about past events/deadlines with nothing left to do

Low-value content:
- Notes superseded by newer notes on same topic
- Low-value fragments, stale drafts, or test notes
- Notes with no clear future utility

Metadata interpretation:
- "openTasks": unchecked tasks from app → active work, never archive
- "allTasksDone": true → all tasks checked, but still verify note content
- "taskCount" without "allTasksDone" → assume open work, don't archive
- "ageDays"/"createdAt": weak signal only, age alone is not reason to archive
- "isRead": true → weak positive signal only if content also looks inactive
- "folderName": contextual only, not a decision factor

Safety guidelines:
- When uncertain: omit the note (don't archive)
- Target: suggest 10-30% of notes when inbox is cluttered
- Return empty array when nothing clearly qualifies
- Never archive notes that look active, urgent, or recently important

Output schema:
{
  "archiveSuggestions": [
    { "recordId": string, "reason": string }
  ]
}

Output rules:
- recordId: exact match to input note id
- reason: one short user-facing sentence explaining why (localized to appLanguage)
- No duplicate recordIds
- Each note appears at most once`;

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

/** @deprecated Use buildAutoOrganizeSystemPrompt('full', 'general') */
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
      AUTO_ORGANIZE_ARCHIVE_LANGUAGE_RULE,
      AUTO_ORGANIZE_EVIDENCE_PRIORITY,
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
    return `\n\n---
VALIDATION FAILED - Fix and retry

Your previous JSON had errors. Output one new valid JSON object.

Required structure:
{
  "merges": [...],
  "deleteEmptyFolderNames": [...]
}

Check:
- Valid JSON syntax (no trailing commas, proper quotes)
- Only these two keys, nothing extra
- sourceFolderNames use exact names from existingFolders
- targetIcon and targetColor are allowed values`;
  }

  if (mode === 'suggest_archive') {
    return `\n\n---
VALIDATION FAILED - Fix and retry

Your previous JSON had errors. Output one new valid JSON object.

Required structure:
{
  "archiveSuggestions": [{"recordId": "...", "reason": "..."}, ...]
}

Check:
- Valid JSON syntax
- Each recordId must be exactly one of: ${JSON.stringify(expectedIds)}
- No duplicate recordIds
- Each reason is a short localized sentence`;
  }

  if (mode === 'assign_existing') {
    return `\n\n---
VALIDATION FAILED - Fix and retry

Mode: assign_existing
Your previous JSON had errors. Output one new valid JSON object.

Critical requirements:
- "folders": MUST be empty array []
- "assignments": exactly ${expectedIds.length} objects (one per note)
- Every recordId must be from: ${JSON.stringify(expectedIds)}
- Every folderName must match existingFolders name OR use "__inbox__"

Common errors to avoid:
- Don't create new folders (folders must be [])
- Don't miss any input notes
- Don't use folderName not in existingFolders`;
  }

  return `\n\n---
VALIDATION FAILED - Fix and retry

Your previous JSON had errors. Output one new valid JSON object.

Common issues to fix:

1. Folders array:
   - Must have 3-8 items (not ${expectedIds.length}, that's notes count)
   - All names must be unique
   - All icons must be from allowed list
   - All colors must be from allowed list

2. Assignments array:
   - Must have exactly ${expectedIds.length} items (one per input note)
   - No duplicates, no omissions
   - Every recordId must be exactly from this list (copy verbatim):
     ${JSON.stringify(expectedIds)}

3. Cross-validation:
   - Every folderName in assignments must EXACTLY match a "name" in folders
   - Check spelling and casing carefully
   - Every folder must be used by at least one assignment

4. Content accuracy:
   - Re-read note classifications, summaries, titles, transcripts
   - Fix any inconsistent or illogical assignments`;
}
