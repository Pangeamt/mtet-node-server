const Joi = require("joi");

const types = ["zero-to-one-hundred", "fluency", "accuracy", "mqm"];

module.exports = {
  // POST /v1/projects
  create: {
    body: {
      name: Joi.string().required(),
      type: Joi.string().valid(types),
      segments: Joi.number().required(),
    },
  },

  // PATCH /v1/projects/:projectId
  update: {
    body: {
      name: Joi.string().required(),
      type: Joi.string().valid(types),
      segments: Joi.number().required(),
    },
    params: {
      projectId: Joi.number().integer().min(1).required(),
    },
  },
};
