const Joi = require("joi");

const roles = ["admin", "pm", "evaluator"];

module.exports = {
  // GET /v1/users
  // listUsers: {
  //   query: {
  //     page: Joi.number().min(1),
  //     perPage: Joi.number()
  //       .min(1)
  //       .max(100),
  //     name: Joi.string(),
  //     email: Joi.string(),
  //     role: Joi.string().valid(User.roles)
  //   }
  // },

  // POST /v1/users
  createUser: {
    body: {
      email: Joi.string()
        .email()
        .required(),
      password: Joi.string().required(),
      nickname: Joi.string().max(128),
      role: Joi.string().valid(roles)
    }
  },

  // PUT /v1/users/:userId
  // replaceUser: {
  //   body: {
  //     email: Joi.string()
  //       .email()
  //       .required(),
  //     password: Joi.string()
  //       .min(6)
  //       .max(128)
  //       .required(),
  //     name: Joi.string().max(128),
  //     role: Joi.string().valid(User.roles)
  //   },
  //   params: {
  //     userId: Joi.string()
  //       .regex(/^[a-fA-F0-9]{24}$/)
  //       .required()
  //   }
  // },

  // PATCH /v1/users/:userId
  updateUser: {
    body: {
      email: Joi.string().email(),
      nickname: Joi.string().max(128),
      role: Joi.string().valid(roles)
    },
    params: {
      userId: Joi.number()
        .integer()
        .min(1)
        .required()
    }
  }
};
