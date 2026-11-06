import { Router } from 'express';
import auth from './auth.routes.js';
import institution from './institution.routes.js';
import users from './users.routes.js';
import buildings from './buildings.routes.js';
import energy from './energy.routes.js';
import equipment from './equipment.routes.js';
import findings from './findings.routes.js';
import recommendations from './recommendations.routes.js';
import measures from './measures.routes.js';
import reports from './reports.routes.js';
import exportRoutes from './export.routes.js';

const router = Router();
router.get('/health', (req, res) => res.json({ ok: true }));
router.use('/auth', auth);
router.use('/institution', institution);
router.use('/users', users);
router.use('/buildings', buildings);   // /buildings and /buildings/:id
router.use('/measures', measures);
router.use('/export', exportRoutes);
// Routers that define their own full paths (all under /buildings/:id/... or /analysis/...).
router.use(energy);
router.use(equipment);
router.use(findings);
router.use(recommendations);
router.use(reports);

export default router;
