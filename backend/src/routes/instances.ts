import express, { Request, Response } from 'express';
import InstanceZone from '../models/InstanceZone';

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const instances = await InstanceZone.find().sort({ level: 1, name: 1 });
    res.json(instances);
  } catch (error) {
    console.error('Get instances error:', error);
    res.status(500).json({ error: 'Failed to fetch instances' });
  }
});

router.get('/:zoneId', async (req: Request, res: Response) => {
  try {
    const instance = await InstanceZone.findOne({ zoneId: req.params.zoneId });
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }
    res.json(instance);
  } catch (error) {
    console.error('Get instance error:', error);
    res.status(500).json({ error: 'Failed to fetch instance' });
  }
});

export default router;

