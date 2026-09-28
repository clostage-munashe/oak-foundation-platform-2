import { z } from 'zod';
import { registrationRoles } from './roles';
const short = z.string().trim().max(160);
export const registrationSchema = z.object({
  firstName: short.min(1, 'Enter your first name'),
  lastName: short.min(1, 'Enter your last name'),
  organisation: short.min(1, 'Enter your organisation'),
  programmeArea: short.default(''),
  role: z.enum(registrationRoles),
  email: z
    .email()
    .max(254)
    .transform((v) => v.toLowerCase()),
  phone: z.string().trim().min(1, 'Enter your phone number').max(40),
  dietary: z.string().trim().max(500).default(''),
  accessibility: z.string().trim().max(500).default(''),
  travel: z.string().trim().max(500).default(''),
  accommodation: z.string().trim().max(500).default(''),
  consent: z.literal(true, { error: 'Please agree to the privacy policy' }),
});
export const noteSchema = z.object({
  name: short.min(1),
  organisation: short.min(1),
  text: z.string().trim().min(5).max(3000),
  sessionId: z.string().min(1).max(160),
  day: z.number().int().min(1).max(3),
});
export const codeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^OAK-2026-[A-Z0-9-]{8,64}$/);
