const express = require("express");
const userRoutes = require("./user.route");
const authRoutes = require("./auth.route");
const projectRoutes = require("./project.route");
const taskRoutes = require("./task.route");

const router = express.Router();

/**
 * GET v1/status
 */
router.get("/status", (req, res) => res.send("OK"));

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/projects", projectRoutes);
router.use("/tasks", taskRoutes);

module.exports = router;