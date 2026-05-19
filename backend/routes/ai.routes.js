const express = require("express");
const router = express.Router();
const { protect, restrictTo } = require("../middlewares/auth.middleware");
const { listModels, healthCheck } = require("../controllers/ai.controller");

router.use(protect);
router.get("/models", listModels);
router.post("/models/:id/health-check", restrictTo("admin"), healthCheck);

module.exports = router;
