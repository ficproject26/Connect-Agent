import { Router } from 'express';
import {
  getTerritoryHierarchy,
  getAllTerritoryHierarchy,
  getStates,
  getDistricts,
  getDivisions,
  getPincodes,
  lookupPincode
} from '../controllers/territory.controller';
import { optionalAuthMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Public / role-aware territory hierarchy from central Admin Pincode Management database
router.get('/hierarchy', optionalAuthMiddleware, getTerritoryHierarchy);
router.get('/all-hierarchy', getAllTerritoryHierarchy);
router.get('/states', getStates);
router.get('/districts', getDistricts);
router.get('/divisions', getDivisions);
router.get('/pincodes', getPincodes);
router.get('/lookup/:pincode', lookupPincode);

export default router;
