const db = require("./../../models");
const httpStatus = require("http-status");
const APIError = require("./../utils/APIError");
const User = db.User;

const checkDuplicateUserNameOrEmail = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({
      where: {
        email: email,
        remove: false
      }
    });

    if (user) {
      throw new APIError({
        status: httpStatus.BAD_REQUEST,
        message: "Email is already in use!"
      });
    }
    next();
  } catch (error) {
    next(error);
  }
};

const signUpVerify = {};
signUpVerify.checkDuplicateUserNameOrEmail = checkDuplicateUserNameOrEmail;

module.exports = signUpVerify;
