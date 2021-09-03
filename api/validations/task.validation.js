const Joi = require("joi");

let evaluations = Joi.object().keys({
  // evaluator: Joi.object().required(),
  tus: Joi.array().required(),
  tuvs: Joi.number().required(),
  showSourceText: Joi.boolean().required(),
  showReferenceText: Joi.boolean().required()
});

module.exports = {
  // POST /v1/tasks
  create: {
    body: {
      tasks: Joi.array().items(evaluations)
    }
  },

  // PATCH /v1/tasks/:taskId
  update: {
    body: {
      active: Joi.boolean().required()
    },
    params: {
      taskId: Joi.number()
        .integer()
        .min(1)
        .required()
    }
  }
};
