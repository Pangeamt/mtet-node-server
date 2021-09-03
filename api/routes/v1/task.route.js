const express = require("express");
const validate = require("express-validation");
const controller = require("../../controllers/task.controller");

// const { create, update } = require("../../validations/task.validation");
const verifyJwtToken = require("./../../utils/verifyJwtToken");

let isEvaluator = verifyJwtToken.isEvaluator;
let verifyToken = verifyJwtToken.verifyToken;

const router = express.Router();

/**
 * Load user when API with userId route parameter is hit
 */
router.param("taskId", controller.load);
router.param("evaluationId", controller.loadEvaluation);

router
  .route("/")
  .get(verifyToken, controller.list)
  .post(verifyToken, controller.create);

router.route("/evaluator").get(verifyToken, isEvaluator, controller.evaluator);

router
  .route("/:taskId")
  .get(verifyToken, controller.get)
  .post(verifyToken, controller.assign)
  .patch(verifyToken, controller.active)
  .put(verifyToken, controller.restart)
  .delete(verifyToken, controller.remove);

router
  .route("/:taskId/toExport")
  .get(verifyToken, controller.getJson)

router.route("/evaluation/save").post(verifyToken, controller.setValue);

module.exports = router;
