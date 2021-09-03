'use strict';
module.exports = (sequelize, DataTypes) => {
  const Language = sequelize.define('Language', {
    sources: DataTypes.STRING,
    targets: DataTypes.STRING,
    natives: DataTypes.STRING
  }, {});
  Language.associate = function(models) {
    // associations can be defined here
    Language.belongsTo(models.User);
  };
  return Language;
};