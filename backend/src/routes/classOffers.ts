import { Router } from 'express';
import {
  createClassOffer,
  deleteClassOffer,
  getClassOfferById,
  listClassOffers,
} from '../controllers/classOffersController';
import { authenticate, authorize } from '../middleware/authenticate';

const router = Router();

router.use(authenticate, authorize('center_admin'));

router.get('/', listClassOffers);
router.post('/', createClassOffer);
router.get('/:id', getClassOfferById);
router.delete('/:id', deleteClassOffer);

export default router;
