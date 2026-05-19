const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/auth.middleware");
const {
  getProjects, createProject, getProject, updateProject, deleteProject,
  getFiles, getFileContent, getChatHistory, exportProject,
} = require("../controllers/project.controller");
const { generateWebsite, editWebsite } = require("../controllers/ai.controller");

router.use(protect);

router.route("/").get(getProjects).post(createProject);
router.route("/:id").get(getProject).put(updateProject).delete(deleteProject);
router.get("/:id/files", getFiles);
router.get("/:id/files/content", getFileContent);
router.get("/:id/chat", getChatHistory);
router.get("/:id/export", exportProject);
router.post("/:id/generate", generateWebsite);
router.post("/:id/edit", editWebsite);

module.exports = router;
