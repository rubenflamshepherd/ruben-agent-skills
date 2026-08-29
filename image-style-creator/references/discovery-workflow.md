# Image Style Discovery Workflow

Use this workflow conversationally. Reuse information already supplied by the
user and ask only for decisions or missing preferences that materially change
the visual system.

## 1. Establish the brief

Determine:

- the images the style should produce and where they will appear;
- the intended audience, emotional effect, and level of visual restraint;
- supplied reference images, links, brands, artists, or existing work;
- known likes, dislikes, forbidden motifs, and practical crop constraints;
- whether the style must span different subjects, formats, or environments.

Inspect any supplied sources before asking questions. Summarize the brief in a
few sentences and obtain agreement before curating inspiration.

## 2. Build the inspiration board

Aim for 10–15 references in total when each adds distinct evidence. Combine
user-supplied material with researched references that fill gaps in:

- palette and contrast;
- lighting and atmosphere;
- medium and production technique;
- material, texture, and imperfection;
- composition, negative space, and visual density;
- subject scale and depth;
- emotional tone and conceptual intensity.

Avoid a board dominated by one subject. Repeated subjects cause content to be
mistaken for style.

Present researched options in batches of three. For each option provide a
direct source-page URL, the visual dimension it contributes, why it may fit,
and its main risk. Use simple A/B/C labels and wait for the user's selection or
rejection before presenting the next batch. Do not download or copy third-party
images into the eventual skill.

Stop curating when the board covers the important dimensions and new options
are no longer changing the emerging definition.

## 3. Extract style hypotheses

Analyze the selected board as an art director. Separate:

- genuinely shared visual treatment;
- deliberate tensions or contrasts the user selected;
- one-off characteristics that belong to a particular reference;
- recurring subjects that must not become mandatory motifs.

Present three distinct style hypotheses labeled A/B/C. Each must include:

- a short working name;
- a one-sentence visual formula;
- medium, palette, lighting, texture, composition, and emotional tone;
- any recurring conceptual or content grammar;
- what it deliberately excludes;
- the largest risk of becoming generic, derivative, or hard to transfer.

Recommend one hypothesis, but let the user select, combine, or revise them.
Turn the approved direction into a provisional style specification before
generating images.

## 4. Establish canonical anchor one

Anchor one should demonstrate the style's most defining combination of medium,
palette, material treatment, composition, and emotional effect.

1. Propose three original image concepts that do not reproduce inspiration
   subjects or compositions. Make the concepts meaningfully different, not
   variations of one object.
2. Explain what each concept tests and its main visual risk.
3. Let the user revise the set, then generate all three as separate images.
4. Label every input image as a style reference, content reference, or edit
   target. Tell the generator what to borrow and what not to reproduce.
5. Inspect the outputs for style fidelity, originality, physical or graphical
   coherence, composition, destination usability, and artifacts.
6. Let the user select a candidate. Apply only narrow, explicitly described
   edits while preserving the successful composition and style.
7. Lock the anchor only after the user explicitly approves it.

## 5. Establish canonical anchor two

Repeat the same concept-first, three-image process. Anchor two must change at
least two substantial content dimensions such as subject domain, scale,
environment, viewpoint, composition, or narrative density.

It should look like work from the same art director without copying anchor
one's focal object, layout, visual trick, or story. Reject a candidate that is
consistent only because it repeats anchor one.

## Rejected-round policy

When the user rejects an entire three-image round, summarize the concrete
failures and revise the next concepts accordingly. If the user rejects a
second complete round at the same checkpoint, stop generating. Compare the
provisional specification with the rejection evidence, identify the failed
assumptions, revise the written direction with the user, and obtain approval
before spending another generation round.

## 6. Run the range test

Identify the dimension least proven by the anchors, such as:

- intimate versus architectural scale;
- object versus human or environmental subject;
- still life versus spatial or narrative scene;
- sparse versus moderately dense composition;
- one intended destination versus another crop or format.

Propose three stress-test directions and recommend the one with the highest
information value. After the user chooses, generate one test image. It passes
only if the style remains recognizable without importing an anchor's subject,
composition, or signature mechanism.

Keep the passing image as noncanonical evidence. If it fails, update the
provisional specification and generate one revised test only after the user
approves the diagnosis.

## 7. Name and lock the style

After the stress test passes, propose three evocative names with valid
lowercase, hyphenated skill slugs. Check for repository name collisions before
presenting them. Explain briefly what defining tension or quality each name
captures.

After the user chooses, present a style-lock summary containing:

- the name, slug, and one-sentence core idea;
- intended uses and range;
- the defining visual DNA;
- the two anchor roles and the stress-test finding;
- the content/style boundary;
- the most important avoid characteristics;
- the files that will be created and where;
- the local registration and installation actions that will follow.

Wait for approval. Then proceed to the generated-skill contract.

## Generation and critique discipline

Use structured production prompts that state the asset type, original subject,
scene, medium, composition, lighting, palette, materials, input-image roles,
constraints, and avoid list. Reference the provisional style definition
directly. Require an original composition and explicitly forbid copying
recognizable subjects, layouts, text, logos, or motifs from style references.

Do not use vague revision instructions such as “make it better” or “more like
the references.” Name the smallest observable change and the invariants that
must remain untouched.

When comparing candidates, use a compact evidence-based assessment of:

- fidelity to the provisional style;
- clarity and originality of the concept;
- technical and material coherence;
- composition and intended-crop resilience;
- recognizability at the required display size;
- dependence on copied reference content.

Make a recommendation without overriding the user's aesthetic choice.
