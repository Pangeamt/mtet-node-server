"use strict";
const sequelizePaginate = require("sequelize-paginate");

module.exports = (sequelize, DataTypes) => {
  const Project = sequelize.define(
    "Project",
    {
      name: { type: DataTypes.STRING, unique: true },
      source: DataTypes.STRING,
      target: DataTypes.STRING,
      segments: DataTypes.INTEGER,

      remove: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      type: DataTypes.ENUM("zero-to-one-hundred", "fluency", "accuracy", "mqm"),
    },
    {}
  );
  Project.associate = function (models) {
    // associations can be defined here
    // Project.belongsToMany(models.Tuv);
    Project.hasMany(models.Task);
    Project.belongsToMany(models.Tuv, {
      through: "TuvProject",
      as: "tuvs",
      foreignKey: "projectId",
    });
  };
  sequelizePaginate.paginate(Project);
  return Project;
};
