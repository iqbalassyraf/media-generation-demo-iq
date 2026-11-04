export type Aspect = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";

export type Brand = {
  id: string;
  name: string;
  tagline: string;
  colors: string[];
  fonts: string;
  tone: string;
  useWords: string;
  avoidWords: string;
  notes: string;
  logo: string | null; // data URL, small PNG/SVG/JPEG
  updatedAt: number;
};

export type StepStatus = "pending" | "running" | "succeeded" | "failed";

export type Step = {
  id: string;
  label: string;
  type: "image" | "video";
  aspectRatio: Aspect;
  status: StepStatus;
  prompt: string; // rendered prompt actually sent to the provider
  operationName?: string;
  error?: string;
};

export type Output = {
  stepId: string;
  label: string;
  mimeType: string;
  url: string;
  aspectRatio: Aspect;
  mock: boolean;
};

export type JobStatus = "queued" | "running" | "succeeded" | "failed";

export type Job = {
  id: string;
  workflowId: string;
  workflowName: string;
  brandId: string;
  brand: Brand; // snapshot at run time, so results stay traceable after brand edits
  inputs: Record<string, string>; // image inputs are stored as "ref:<filename>"
  status: JobStatus;
  steps: Step[];
  outputs: Output[];
  error?: string;
  createdAt: number;
  updatedAt: number;
};

export type InputDef = {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "image";
  required?: boolean;
  options?: string[];
  placeholder?: string;
};

export type StepDef = {
  id: string;
  label: string;
  type: "image" | "video";
  aspectRatio: Aspect;
  durationSeconds?: number; // video only
  prompt: string; // template: {{brand}}, {{<input key>}}
  useReferenceImage?: boolean;
  useBrandLogo?: boolean; // image only
};

export type WorkflowDef = {
  id: string;
  name: string;
  description: string;
  inputs: InputDef[];
  steps: StepDef[];
};
