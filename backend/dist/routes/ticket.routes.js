"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ticket_controller_1 = require("../controllers/ticket.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authMiddleware);
router.get('/', ticket_controller_1.getTickets);
router.get('/:id', ticket_controller_1.getTicketById);
router.post('/', ticket_controller_1.createTicket);
router.patch('/:id/status', ticket_controller_1.updateTicketStatus);
exports.default = router;
//# sourceMappingURL=ticket.routes.js.map