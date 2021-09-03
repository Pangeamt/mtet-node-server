const express = require("express");
const validate = require("express-validation");
const controller = require("./../../controllers/auth.controller");
const { register, login } = require("../../validations/auth.validation");
const verifySignUp = require("./../../utils/verifySignUp");
const router = express.Router();

router
  .route("/register")
  .post(
    validate(register),
    verifySignUp.checkDuplicateUserNameOrEmail,
    controller.register
  );

router.route("/login").post(validate(login), controller.login);

// router.route("/refresh-token").post(controller.refresh);

// router.route("/send-password-reset").post(controller.sendPasswordReset);

// router.route("/reset-password").post(controller.resetPassword);

module.exports = router;
