import { z } from 'zod';

export const userRegisterSchema = z.object({
  name: z.string().min(1, 'Le nom est requis.').max(50),
  email: z.string().email('Adresse email invalide.'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caracteres.'),
  playerId: z.string().min(1).optional(),
});

export const userUpdateProfileSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  image: z.string().url().optional().or(z.literal('')),
});

export const userAdminUpdateSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1).max(50).optional(),
  image: z.string().url().optional().or(z.literal('')),
});

export const userUpdateRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['USER', 'TEAM_CAPTAIN', 'ADMIN']),
});

export const userAssignTeamSchema = z.object({
  userId: z.string().min(1),
  teamId: z.string().min(1),
});

export const userRemoveTeamSchema = z.object({
  userId: z.string().min(1),
});

export const userLinkPlayerSchema = z.object({
  userId: z.string().min(1),
  playerId: z.string().min(1).nullable(),
});
