import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth.routes';
import { usuariosRouter } from './routes/usuarios.routes';
import { empresasRouter } from './routes/empresas.routes';
import { empleadosRouter } from './routes/empleados.routes';
import { plantillasRouter } from './routes/plantillas.routes';
import { contratosRouter } from './routes/contratos.routes';
import { errorHandler } from './middleware/errorHandler';
import { requireAuth } from './middleware/auth';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRouter);

app.use('/api/usuarios', requireAuth, usuariosRouter);
app.use('/api/empresas', requireAuth, empresasRouter);
app.use('/api/empleados', requireAuth, empleadosRouter);
app.use('/api/plantillas', requireAuth, plantillasRouter);
app.use('/api/contratos', requireAuth, contratosRouter);

app.use(errorHandler);

const PORT = Number(process.env.PORT) || 4100;
app.listen(PORT, () => {
  console.log(`API escuchando en http://localhost:${PORT}`);
});
