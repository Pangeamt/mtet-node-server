const httpStatus = require("http-status");
const jwt = require("jsonwebtoken");
const randtoken = require("rand-token");
const bcrypt = require("bcryptjs");
const db = require("./../../models");
const APIError = require("./../utils/APIError");

const User = db.User;
const { jwtSecret } = require("./../../config/vars");

var refreshTokens = {};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      where: {
        email: email,
        remove: false,
      },
    });

    if (!user) {
      throw new APIError({
        status: httpStatus.UNAUTHORIZED,
        message: "No account found with that email",
      });
    }
    var passwordIsValid = bcrypt.compareSync(password, user.password);

    if (!passwordIsValid) {
      throw new APIError({
        status: httpStatus.UNAUTHORIZED,
        message: "Invalid Password!",
      });
    }

    var token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      jwtSecret,
      {
        expiresIn: 86400, // expires in 24 hours
      }
    );

    var refreshToken = randtoken.uid(256);
    refreshTokens[refreshToken] = email;

    const userTransformed = user.get({
      plain: true,
    });
    delete userTransformed.password;
    return res.json({ token, user: userTransformed });
  } catch (error) {
    return next(error);
  }
};

exports.register = async (req, res, next) => {
  try {
    const { email, password, nickname, role } = req.body;
    const query = {
      email,
      nickname,
      password: bcrypt.hashSync(password, 8),
      role,
    };

    const user = await User.create(query);
    const userTransformed = user.get({
      plain: true,
    });
    res.status(httpStatus.CREATED);
    return res.json({ user: userTransformed });
  } catch (error) {
    return next(error);
  }
};
