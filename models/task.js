"use strict";
const sequelizePaginate = require('sequelize-paginate')
module.exports = (sequelize, DataTypes) => {
  const Task = sequelize.define(
    "Task",
    {
      showSourceText: DataTypes.BOOLEAN,
      showReferenceText: DataTypes.BOOLEAN,
      tuvs: DataTypes.INTEGER,
      tus: DataTypes.INTEGER,
      active: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      remove: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      complete: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      }
    },
    {}
  );
  Task.associate = function(models) {
    // associations can be defined here
    Task.hasMany(models.Evaluation);
    Task.belongsTo(models.User);
  };
  sequelizePaginate.paginate(Task)
  return Task;
};
