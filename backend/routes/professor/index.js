const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../../middleware/auth");

const lecturesRouter = require("./lectures");
const classesRouter = require("./classes");
const membersRouter = require("./members");
const liveRouter = require("./live");
const statisticsRouter = require("./statistics");
const reportRouter = require("./report");

router.use("/lectures", lecturesRouter);
router.use("/lectures", classesRouter);
router.use("/lectures", membersRouter);
router.use("/lectures", liveRouter);
router.use("/lectures", statisticsRouter);
router.use("/lectures", reportRouter);

router.post("/lecture/:lectureId/class/:classId/create", authenticateToken, (req, res) => {});
router.get("/lecture/:lectureId/class/invite", authenticateToken, (req, res) => {});
router.post("/lecture/:lectureId/class/:classId/reservation", authenticateToken, (req, res) => {});

module.exports = router;

