import express from 'express';
import { authenticateToken } from '../middleware/Auth.js';
import { 
  updateProfessorStatus,
  getProfessorsStatus
} from '../controllers/professorController.js';

const professorRoutes = express.Router();

professorRoutes.put('/status', authenticateToken, updateProfessorStatus);
professorRoutes.get('/get-status', authenticateToken, getProfessorsStatus);

export default professorRoutes;