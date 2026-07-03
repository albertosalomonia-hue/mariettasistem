import { Router } from 'express';
import { pool } from '../config/db';

export const empresasRouter = Router();

empresasRouter.get('/', async (_req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM empresas WHERE activa = 1 ORDER BY id');
    res.json(rows);
  } catch (err) {
    next(err);
  }
});
