import express from 'express';
import { 
  getTables, 
  getTablesWithAvailability, 
  getTableById, 
  createTable, 
  updateTable, 
  deleteTable, 
  handleMaintenance,
  bulkUpdateLayout 
} from '../controllers/tableController';
import { protect, admin } from '../middleware/authMiddleware';

const router = express.Router();

router.route('/')
  .get(getTables)
  .post(protect, admin, createTable);

router.get('/availability', getTablesWithAvailability);
router.put('/bulk-layout', protect, admin, bulkUpdateLayout);

router.route('/:id')
  .get(getTableById)
  .put(protect, admin, updateTable)
  .delete(protect, admin, deleteTable);

router.put('/:id/maintenance', protect, admin, handleMaintenance);

export default router;
