import type { WorkflowDef } from "./types";

/**
 * Workflow recipes. Each is data, not code: ordered steps, each with a prompt template.
 * Template placeholders: {{brand}} is replaced with the brand block; {{key}} with an input value.
 */
export const WORKFLOWS: WorkflowDef[] = [
  {
    id: "hero-image",
    name: "Product hero image",
    description: "One wide banner image for a website or landing page.",
    inputs: [
      { key: "subject", label: "What should the image show?", type: "textarea", required: true, placeholder: "House Blend bag on a wooden counter next to a pour-over setup, morning light" },
      { key: "mood", label: "Mood", type: "select", options: ["Warm", "Bold", "Minimal", "Premium"] },
      { key: "reference", label: "Product photo (optional)", type: "image" },
    ],
    steps: [
      {
        id: "hero",
        label: "Hero banner (16:9)",
        type: "image",
        aspectRatio: "16:9",
        useReferenceImage: true,
        useBrandLogo: true,
        prompt:
          "Create a hero banner image. Scene: {{subject}}. Mood: {{mood}}. Leave generous negative space on the left third for headline text. Do not render any text in the image. {{brand}}",
      },
    ],
  },
  {
    id: "social-set",
    name: "Social post set",
    description: "One brief, three formats: feed square, story, and landscape.",
    inputs: [
      { key: "message", label: "Core message", type: "textarea", required: true, placeholder: "New Ethiopia single origin is in stores this week" },
      { key: "cta", label: "Call-to-action theme", type: "text", placeholder: "Come try it this weekend" },
    ],
    steps: [
      {
        id: "feed-square",
        label: "Feed post (1:1)",
        type: "image",
        aspectRatio: "1:1",
        useBrandLogo: true,
        prompt:
          "Square social feed visual, product-forward and inviting. Message: {{message}}. Call-to-action feeling: {{cta}}. Do not render any text in the image. {{brand}}",
      },
      {
        id: "story",
        label: "Story (9:16)",
        type: "image",
        aspectRatio: "9:16",
        useBrandLogo: true,
        prompt:
          "Vertical story visual with clear space at the top and bottom for overlaid text. Message: {{message}}. Feeling: {{cta}}. Do not render any text in the image. {{brand}}",
      },
      {
        id: "landscape",
        label: "Landscape (16:9)",
        type: "image",
        aspectRatio: "16:9",
        useBrandLogo: false,
        prompt:
          "Wide editorial photo-style visual. Message: {{message}}. Feeling: {{cta}}. Do not render any text in the image. {{brand}}",
      },
    ],
  },
  {
    id: "product-video",
    name: "Short product video",
    description: "A short clip from a scene description, optionally animating a product photo.",
    inputs: [
      { key: "scene", label: "Describe the shot", type: "textarea", required: true, placeholder: "Slow push-in on a bag of coffee beans, steam rising from a mug behind it" },
      { key: "reference", label: "Starting frame (optional)", type: "image" },
    ],
    steps: [
      {
        id: "clip",
        label: "Clip (16:9, 6s)",
        type: "video",
        aspectRatio: "16:9",
        durationSeconds: 6,
        useReferenceImage: true,
        prompt:
          "Short product video. Shot: {{scene}}. Smooth camera movement, natural lighting, no on-screen text. {{brand}}",
      },
    ],
  },
];

export function getWorkflow(id: string): WorkflowDef | undefined {
  return WORKFLOWS.find((w) => w.id === id);
}
