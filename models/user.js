"use strict";
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      nickname: DataTypes.STRING,
      password: DataTypes.STRING,
      email: { type: DataTypes.STRING, unique: true },
      role: DataTypes.ENUM("admin", "pm", "evaluator"),
      remove: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      }
    },
    {}
  );
  User.associate = function(models) {
    // associations can be defined here
  };
  return User;
};
