const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/applicationController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', ctrl.getApplications);
router.post('/', ctrl.createApplication);
router.get('/:ref', ctrl.getApplicationByRef);
router.put('/:ref', ctrl.updateApplication);
router.put('/:ref/reference', ctrl.renameApplicationReference);
router.delete('/:ref', ctrl.deleteApplication);

router.post('/:ref/messages', ctrl.addMessage);
router.post('/:ref/notes', ctrl.addNote);
router.post('/:ref/documents', ctrl.addDocument);
router.delete('/:ref/documents/:docId', ctrl.deleteDocument);

router.post('/:ref/request-info', ctrl.requestMoreInfo);
router.post('/:ref/respond-info', ctrl.respondToInfoRequest);
router.post('/:ref/clear-info', ctrl.clearInfoRequest);
router.post('/:ref/cancel', ctrl.cancelApplication);

module.exports = router;