"use strict";
const sequelizePaginate = require("sequelize-paginate");
module.exports = (sequelize, DataTypes) => {
  const Evaluation = sequelize.define(
    "Evaluation",
    {
      source: DataTypes.STRING,
      reference: DataTypes.STRING,
      text: DataTypes.STRING,
      from: DataTypes.STRING,
      tuId: DataTypes.STRING,
      // to: DataTypes.STRING,
      value: {
        type: DataTypes.STRING,
        defaultValue: 0,
      },
      comment: {
        type: DataTypes.STRING,
        defaultValue: "",
      },
      translation: {
        type: DataTypes.STRING,
        defaultValue: "",
      },
      complete: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },

      accuracy: {
        type: DataTypes.JSON,
        defaultValue: {
          value: "0",
          subValue: "0",
        },
      },
      fluency: {
        type: DataTypes.JSON,
        defaultValue: {
          value: "0",
          subValue: "0",
        },
      },
      terminology: {
        type: DataTypes.JSON,
        defaultValue: {
          value: "0",
          subValue: "0",
        },
      },
      style: {
        type: DataTypes.JSON,
        defaultValue: {
          value: "0",
          subValue: "0",
        },
      },
      localeConvention: {
        type: DataTypes.JSON,
        defaultValue: {
          value: "0",
          subValue: "0",
        },
      },
    },
    {}
  );
  Evaluation.associate = function (models) {
    // associations can be defined here
    Evaluation.belongsTo(models.User);
  };
  sequelizePaginate.paginate(Evaluation);
  return Evaluation;
};
