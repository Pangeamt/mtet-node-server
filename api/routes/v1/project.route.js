const express = require("express");
const validate = require("express-validation");
const controller = require("../../controllers/project.controller");

const { create, update } = require("../../validations/project.validation");

const verifyJwtToken = require("./../../utils/verifyJwtToken");

let isManager = verifyJwtToken.isManager;
let verifyToken = verifyJwtToken.verifyToken;

const router = express.Router();

/**
 * Load user when API with userId route parameter is hit
 */
router.param("projectId", controller.load);

router
  .route("/")
  .get(verifyToken, isManager, controller.list)
  .post(verifyToken, isManager, validate(create), controller.create);

router
  .route("/create")
  .post(verifyToken, isManager, validate(create), controller.createFromFiles);

router
  .route("/:projectId")
  .get(verifyToken, isManager, controller.get)
  .patch(verifyToken, isManager, validate(update), controller.update)
  .delete(verifyToken, isManager, controller.remove)
  .post(verifyToken, isManager, controller.clone);

//   .delete(controller.remove);

// router
//   .route("/profile")

//   .get(controller.loggedIn);

module.exports = router;
