import { Router } from 'express';
import {
  getTerritoryHierarchy,
  getStates,
  getDistricts,
  lookupPincode
} from '../controllers/territory.controller';

const router = Router();

// Public / role-aware territory hierarchy from central Admin Pincode Management database
router.get('/hierarchy', getTerritoryHierarchy);
router.get('/states', getStates);
router.get('/districts', getDistricts);
router.get('/lookup/:pincode', lookupPincode);

export default router;
