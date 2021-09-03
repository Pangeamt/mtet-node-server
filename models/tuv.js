"use strict";
module.exports = (sequelize, DataTypes) => {
  const Tuv = sequelize.define(
    "Tuv",
    {
      tuId: DataTypes.STRING,
      language: DataTypes.STRING,
      origin: DataTypes.STRING,
      text: DataTypes.STRING
    },
    {}
  );
  Tuv.associate = function(models) {
    // associations can be defined here
    // Tuv.belongsToMany(models.Project);
    Tuv.belongsToMany(models.Project, {
      through: "TuvProject",
      as: "projects",
      foreignKey: "tuvId"
    });
  };
  return Tuv;
};
