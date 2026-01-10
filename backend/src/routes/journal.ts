import { Router, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();
const prisma = new PrismaClient();

const journalSchema = z.object({
  date: z.string().datetime(),
  content: z.string().min(1),
  mood: z.number().min(1).max(10).optional(),
  lessons: z.string().optional(),
});

router.use(authMiddleware);

// Get all journal entries
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { from, to, limit = '50', offset = '0' } = req.query;
    
    const where: any = { userId: req.userId };
    
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from as string);
      if (to) where.date.lte = new Date(to as string);
    }
    
    const [entries, total] = await Promise.all([
      prisma.journal.findMany({
        where,
        orderBy: { date: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.journal.count({ where }),
    ]);
    
    res.json({ entries, total });
  } catch (error) {
    console.error('Get journals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single journal entry
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const entry = await prisma.journal.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    
    if (!entry) {
      res.status(404).json({ error: 'Journal entry not found' });
      return;
    }
    
    res.json(entry);
  } catch (error) {
    console.error('Get journal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create or update journal entry for a date
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = journalSchema.parse(req.body);
    const date = new Date(data.date);
    date.setHours(0, 0, 0, 0);
    
    const entry = await prisma.journal.upsert({
      where: {
        userId_date: {
          userId: req.userId!,
          date,
        },
      },
      update: {
        content: data.content,
        mood: data.mood,
        lessons: data.lessons,
      },
      create: {
        userId: req.userId!,
        date,
        content: data.content,
        mood: data.mood,
        lessons: data.lessons,
      },
    });
    
    res.status(201).json(entry);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Create journal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update journal entry
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.journal.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    
    if (!existing) {
      res.status(404).json({ error: 'Journal entry not found' });
      return;
    }
    
    const data = journalSchema.partial().parse(req.body);
    
    const entry = await prisma.journal.update({
      where: { id: req.params.id },
      data: {
        content: data.content,
        mood: data.mood,
        lessons: data.lessons,
      },
    });
    
    res.json(entry);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Update journal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete journal entry
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.journal.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    
    if (!existing) {
      res.status(404).json({ error: 'Journal entry not found' });
      return;
    }
    
    await prisma.journal.delete({ where: { id: req.params.id } });
    
    res.json({ message: 'Journal entry deleted' });
  } catch (error) {
    console.error('Delete journal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
