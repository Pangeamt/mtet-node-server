const express = require("express");
const validate = require("express-validation");
const controller = require("./../../controllers/user.controller");

const { createUser, updateUser } = require("../../validations/user.validation");

const router = express.Router();

/**
 * Load user when API with userId route parameter is hit
 */
router.param("userId", controller.load);

router.route("/evaluators").get(controller.evaluators);

router
  .route("/")
  .get(controller.list)
  .post(validate(createUser), controller.create);

router
  .route("/:userId")
  .patch(validate(updateUser), controller.update)
  .delete(controller.remove);

//   .put(controller.replace)

//   .delete(controller.remove);

// router
//   .route("/profile")

//   .get(controller.loggedIn);

module.exports = router;
