"use strict";
module.exports = (sequelize, DataTypes) => {
  const TuvProject = sequelize.define(
    "TuvProject",
    {
      projectId: DataTypes.UUID,
      tuvId: DataTypes.UUID
    },
    {}
  );
  TuvProject.associate = function(models) {
    // associations can be defined here
  };
  return TuvProject;
};
