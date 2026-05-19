const express = require("express");
const router  = express.Router();
const { getAllUsers, getUserById, updateUser, deleteUser } = require("../controllers/user.controller");
const { protect, restrictTo } = require("../middlewares/auth.middleware");

router.use(protect);                       // all user routes require auth

router.get("/",       restrictTo("admin"), getAllUsers);
router.get("/:id",    getUserById);
router.put("/:id",    updateUser);
router.delete("/:id", restrictTo("admin"), deleteUser);

module.exports = router;
