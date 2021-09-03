const jwt = require("jsonwebtoken");
const httpStatus = require("http-status");
const APIError = require("../utils/APIError");
const { jwtSecret } = require("./../../config/vars");
const db = require("./../../models");
const User = db.User;

const verifyToken = async (req, res, next) => {
  try {
    let token = req.headers["x-access-token"] || req.body.token;
    if (!token) {
      throw new APIError({
        message: "Unauthorized",
        status: httpStatus.UNAUTHORIZED
      });
    }

    jwt.verify(token, jwtSecret, (err, decoded) => {
      if (err) {
        throw new APIError({
          message: "Unauthorized",
          status: httpStatus.UNAUTHORIZED
        });
      }
      User.findByPk(decoded.id)
        .then(user => {
          if (user) {
            req.user = user;
            next();
          } else {
            throw new APIError({
              message: "Unauthorized",
              status: httpStatus.UNAUTHORIZED
            });
          }
        })
        .catch(err => {
          next(err);
        });
    });
  } catch (error) {
    next(error);
  }
};

const isEvaluator = async (req, res, next) => {
  try {
    if (req.user.role === "evaluator") {
      next();
      return;
    } else {
      throw new APIError({
        message: "Unauthorized",
        status: httpStatus.UNAUTHORIZED
      });
    }
  } catch (err) {
    res.status(500).json({
      error: err
    });
  }
};

const isManager = async (req, res, next) => {
  try {
    if (req.user.role === "pm") {
      next();
      return;
    } else {
      throw new APIError({
        message: "Unauthorized",
        status: httpStatus.UNAUTHORIZED
      });
    }
  } catch (err) {
    res.status(500).json({
      error: err
    });
  }
};

const authJwt = {};
authJwt.verifyToken = verifyToken;
authJwt.isEvaluator = isEvaluator;
authJwt.isManager = isManager;

module.exports = authJwt;
