---
name: image-style-creator
description: >
  Develop a new reusable image house style through guided reference curation,
  visual hypothesis testing, canonical anchor generation, range validation,
  and packaging as an installable skill. Use when the user asks to create,
  discover, formalize, or package an image aesthetic or repeatable visual
  system. Do not use merely to generate an image in an existing style.
---

# Image Style Creator

Turn subjective taste into a visual system that another agent can apply
without rediscovering it. The final evidence is two complementary canonical
anchors, one noncanonical range test, a written specification, and a record of
the decisions that produced them.

For every new style, read
[references/discovery-workflow.md](references/discovery-workflow.md) in full
before researching references, proposing directions, or generating images.
After the user approves the style-lock checkpoint, read
[references/generated-skill-contract.md](references/generated-skill-contract.md)
in full before creating files.

## Operating rules

- Treat this as a guided art-direction process. Stop at the decision gates in
  the discovery workflow and wait for the user's choice.
- Use the user's references and known preferences first. Research linked
  inspiration only to fill missing dimensions of the style.
- When a raster image-generation capability is available, use it as the
  execution layer. Follow its generation, inspection, and save-path rules.
- Generate each candidate as a separate full-resolution image, never as a
  contact sheet.
- Separate visual treatment from subject matter. Canonical references define
  how images look, not which objects or scenes future images must contain.
- Do not package third-party inspiration images. Preserve their source URLs and
  contribution in the development record; package only approved generated
  evidence or user-owned references the user explicitly authorizes.
- A request to create a style authorizes the final repository-backed skill and
  local installation described here. It does not authorize commits, pushes,
  pull requests, merges, publication, or edits to unrelated external pages.

## Completion

A run is complete only when:

1. the user has approved the two canonical anchors and the range test;
2. the user has selected the style name and skill slug;
3. the final style-lock summary is approved;
4. the style skill conforms to the generated-skill contract;
5. repository validation passes; and
6. the skill is registered and installed through the user's managed skill
   workflow when one exists.

Report the repository path, installed locations, validation results, and any
publication dependency that remains. Never describe an unpublished remote
source as ready for fresh-machine installation.
