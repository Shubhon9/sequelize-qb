const { Model, DataTypes } = require("sequelize");

class View extends Model {}

module.exports = (sequelize) => {
  View.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: DataTypes.INTEGER,
      page: DataTypes.STRING,
    },
    { sequelize, modelName: "View" }
  );

  return View;
};
