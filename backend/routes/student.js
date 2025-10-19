const express = require("express");
const router = express.Router();
const { authenticateToken, requireInstructor } = require("../middleware/auth");

module.exports = router;