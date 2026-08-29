# Generated Image-Style Skill Contract

Read this only after the user approves the style-lock checkpoint. The output is
a self-contained production skill, not merely a mood board or prompt fragment.

## Resolve the destination

Use a repository explicitly named by the user. Otherwise inspect the current
workspace for a unique repository that already contains top-level skill
directories and skill validation. Use it when exactly one candidate is clear;
ask the user only when none or multiple plausible repositories remain.

Check that the chosen slug does not collide with an existing skill. Preserve
all unrelated working-tree changes.

## Required structure

Create this minimum structure:

```text
<style-slug>/
|-- SKILL.md
|-- agents/
|   `-- openai.yaml
|-- assets/
|   |-- anchor-<role-or-subject>.png
|   |-- anchor-<role-or-subject>.png
|   `-- stress-test-<axis-or-subject>.png
`-- references/
    |-- style-spec.md
    `-- development-record.md
```

Use descriptive, stable asset names. Copy the approved full-resolution files
from the image generator's output location into the skill. Preserve the source
files and do not overwrite an existing asset unless the user requested a
replacement.

## SKILL.md requirements

The frontmatter description must state what the style is, the requests that
should activate it, and a meaningful exclusion that prevents generic image
requests from routing to it.

The body must:

- define the purpose without repeating the full style specification;
- require reading `references/style-spec.md` before concepting, prompting,
  generating, editing, or evaluating an image;
- name both canonical anchors and the separate stress-test image with their
  specific evidentiary roles;
- treat those images as style references rather than edit targets;
- prohibit copying their subjects, layouts, or signature mechanisms;
- direct the agent to use the environment's raster generation capability;
- preserve the user's subject, output count, destination, and authorization
  boundaries;
- include destination-specific operating rules only when they were part of the
  approved brief.

Do not require ordinary production runs to read the development record.

## style-spec.md requirements

Write a versioned specification containing:

1. **Core idea:** the shortest useful definition of what makes the style
   recognizable.
2. **Intended uses and range:** the destinations, subjects, and scale proven by
   the anchors and range test.
3. **Canonical evidence:** what each anchor proves and what the stress test
   validates without making it canonical.
4. **Visual DNA:** medium, mood, palette, lighting, materials, texture, depth,
   composition, scale, degree of polish, and any conceptual or content grammar
   actually supported by the selected evidence.
5. **Content/style boundary:** characteristics to transfer and subjects,
   layouts, motifs, or mechanisms that must not be copied.
6. **Variation envelope:** which dimensions can change while the work remains
   recognizably in style.
7. **Avoid list:** specific failure modes demonstrated by rejected options or
   explicitly named by the user.
8. **Directioning template:** a reusable prompt for proposing distinct image
   concepts before generation.
9. **Production prompt template:** structured reference roles, scene, subject,
   medium, composition, lighting, palette, materials, constraints, and avoids.
10. **Destination profiles:** only the crop, safe-area, typography, or format
    rules required by approved use cases.
11. **Final quality gate:** observable criteria covering style fidelity,
    originality, coherence, composition, destination fitness, and avoidance of
    copied anchor content.

Do not insert Quiet Impossibility's anomaly, palette, material, or mood rules
unless the new style independently establishes them.

## development-record.md requirements

Archive information needed to understand or deliberately revise the style:

- original goal, intended uses, and constraints;
- inspiration source URLs, the contribution of each selected reference, and
  whether it was user-supplied or researched;
- rejected references and characteristics when they materially shaped the
  result;
- the three style hypotheses and the user's selection or combination;
- anchor and stress-test concepts, prompts, output filenames, selections,
  revision prompts, and rejection reasons;
- the stress-test axis, result, and any specification change it caused;
- the final naming decision and versioning notes.

Record facts and concise rationale rather than reproducing the conversation.
Do not embed third-party images or private user material without explicit
authorization.

## Metadata and repository integration

Create `agents/openai.yaml` with a quoted display name and a 25–64 character
short description consistent with the generated skill. Keep normal automatic
invocation unless the user explicitly requested otherwise.

If the repository maintains a skill catalog, add a concise entry. Use its own
validator, then run whitespace checks. If no repository validator exists, use
an available skill validator and inspect the final structure for unfinished
placeholders.

When the user's environment manages global skills through profile manifests,
update the applicable manifest and use that repository's installer. On Ruben's
machines, default reusable image styles to the common manifest so Codex,
Claude Code, and Pi receive the same skill; use a personal- or work-only
manifest only when the user requests that scope.

If the permanent manifest references a remote repository whose new skill has
not been published, install the approved local repository version through the
managed installer and report that fresh-machine installation still depends on
a separate publish step.

Do not commit, push, open or merge a pull request, or publish the new style
unless the user separately authorizes that workflow.
