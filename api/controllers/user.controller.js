const httpStatus = require("http-status");
const bcrypt = require("bcryptjs");

const db = require("./../../models");
const APIError = require("./../utils/APIError");

const User = db.User;

exports.load = async (req, res, next, id) => {
  try {
    const user = await User.findByPk(id);
    req.locals = { user };
    return next();
  } catch (error) {
    return next(error);
  }
};

exports.get = (req, res) =>
  res.json(
    req.locals.user.get({
      plain: true
    })
  );

exports.loggedIn = (req, res) =>
  res.json(
    req.user.get({
      plain: true
    })
  );

exports.create = async (req, res, next) => {
  try {
    const { email, password, nickname, role } = req.body;
    const query = {
      email,
      nickname,
      password: bcrypt.hashSync(password, 8),
      role
    };

    const user = await User.create(query);
    const userTransformed = user.get({
      plain: true
    });
    res.status(httpStatus.CREATED);
    return res.json({ user: userTransformed });
  } catch (error) {
    return next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    if (req.body.password)
      req.body.password = bcrypt.hashSync(req.body.password, 8);
    const user = Object.assign(req.locals.user, req.body);

    await user.save();

    const userTransformed = user.get({
      plain: true
    });
    return res.json({ user: userTransformed });
  } catch (err) {
    return next(error);
  }
};

exports.list = async (req, res, next) => {
  try {
    let query = {
      attributes: ["id", "nickname", "email", "role"],
      where: {
        remove: false
      },
      order: [["createdAt", "DESC"]]
    };
    const users = await User.findAll(query);
    const transformedUsers = users.map(user =>
      user.get({
        plain: true
      })
    );
    res.json(transformedUsers);
  } catch (error) {
    next(error);
  }
};

exports.evaluators = async (req, res, next) => {
  try {
    let query = {
      attributes: ["id", "nickname", "email"],
      where: {
        remove: false,
        role: "evaluator"
      },
      order: [["createdAt", "DESC"]]
    };
    const users = await User.findAll(query);
    const transformedUsers = users.map(user =>
      user.get({
        plain: true
      })
    );
    res.json(transformedUsers);
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { user } = req.locals;

    user.remove = true;
    await user.save();

    return res.status(httpStatus.NO_CONTENT).end();
  } catch (error) {
    return next(error);
  }
};
