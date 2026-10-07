---
name: simple-bot-avatars
description: Create simple, friendly bot avatars in Ruben's approved geometric style, with bold silhouettes and minimal features readable at small Slack or chat icon sizes. Use for this established avatar aesthetic or matching bot icon families, not detailed mascot illustrations or unrelated logos.
---

# Simple Bot Avatars

Create warm, recognizable bot identities using a few large shapes. The approved
anchor is [assets/friendly-robot.png](assets/friendly-robot.png): a smiling robot
with a checkmark antenna, selected for Data Alert Replies. Treat it as a style
reference, not an edit target or a requirement that every bot use a checkmark.

## Visual basis

- Flat, vector-like raster illustration with one compact, centered silhouette.
- Deep navy background, warm off-white primary shape, mint-green accent. Use
  these defaults for a matching family; honor explicit palette requests.
- A rounded robot head or speech bubble, at most a few oversized facial features,
  and one clear cue for the bot's purpose. Integrate the cue into the face or
  silhouette rather than adding decorative objects.
- Prefer dots, thick curves, and broad checkmarks. Avoid fine lines, tiny charts,
  circuitry, text, complex hardware, reflections, and layered badges.
- Aim for solid colors and clean edges. Avoid intentional texture, gradients,
  glow, dimensional rendering, or busy lighting. The earlier polished 3D robot
  was rejected as too detailed at small sizes.
- Square canvas, generous margins for circular cropping, and a strong silhouette
  that remains clear at 32–48 pixels. Simplicity matters more than detail visible
  only at full resolution.

## Workflow

1. Use the requested bot purpose to choose one visual cue. Preserve the requested
   number of options. For variants, change the silhouette or facial mechanism,
   not just colors.
2. Use the available image-generation tool, following its imagegen skill when
   present. View the bundled anchor and provide it as a style reference when
   supported and useful. Generate a new subject rather than copying the anchor
   by default.
3. Adapt the template in [references/prompts.md](references/prompts.md). It also
   preserves the exact prompt that produced the approved anchor.
4. Inspect each result for bold silhouette, few features, generous crop margins,
   and clear contrast. When preview tooling is available, display the unchanged
   image at 32 and 48 pixels to check legibility. If the idea disappears at that
   size, remove a feature or enlarge the main mark instead of adding detail.
5. Save candidates locally with numbered, descriptive filenames. Keep previous
   options intact and return links for comparison. Use the user's destination
   or an appropriate project assets directory.
6. If the user requests approval before publishing, leave the live avatar
   unchanged until a choice arrives. A request to generate options alone does
   not authorize uploading them. After an authorized upload, verify the result
   and keep the chosen local file.
