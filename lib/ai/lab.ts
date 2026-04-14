import { z } from 'zod';

export const forgeLabAllowedTools = ['rembg'] as const;
export const forgeLabAllowedModels = ['google/nano-banana', 'google/nano-banana-pro'] as const;
export const forgeLabInputIdRegex = /^[a-zA-Z0-9_]+$/;

export const forgeLabInputSchema = z.object({
  id: z.string().min(1).max(32).regex(forgeLabInputIdRegex),
  label: z.string().min(1).max(80),
  type: z.enum(['image', 'text', 'number']),
  placeholder: z.string().max(140).optional().nullable(),
  defaultValue: z.string().max(140).optional().nullable(),
  required: z.boolean().optional()
}).strict();

export const forgeLabInputsSchema = z.array(forgeLabInputSchema).max(12).superRefine((inputs, ctx) => {
  const seen = new Set<string>();
  for (const input of inputs) {
    const id = input.id.trim();
    if (seen.has(id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate input id: ${id}`,
        path: ['inputs']
      });
      return;
    }
    seen.add(id);
  }
});

export const forgeLabWorkflowSchema = z.object({
  tools: z.array(z.enum(forgeLabAllowedTools)).default([]),
  model: z.enum(forgeLabAllowedModels).default('google/nano-banana')
}).strict();

export const createForgeAppSchema = z.object({
  name: z.string().min(1).max(80).default('Untitled App'),
  description: z.string().max(600).optional().nullable().default(''),
  inputs: z.preprocess((val) => (val == null ? [] : val), forgeLabInputsSchema).default([]),
  workflow: z.preprocess((val) => (val == null ? {} : val), forgeLabWorkflowSchema).default({ tools: [], model: 'google/nano-banana' }),
  template: z.preprocess((val) => (val == null ? '' : val), z.string().max(4000)).default('')
}).strict();

export const updateForgeAppSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(600).optional().nullable(),
  inputs: z.preprocess((val) => (val === undefined ? undefined : (val ?? [])), forgeLabInputsSchema.optional()),
  workflow: z.preprocess((val) => (val === undefined ? undefined : (val ?? {})), forgeLabWorkflowSchema.optional()),
  template: z.preprocess((val) => (val === undefined ? undefined : (val ?? '')), z.string().max(4000).optional())
}).strict();
