const { Model, DataTypes } = require("sequelize");

class User extends Model {
  static virtualAttributes(sequelize) {
    return {
      totalViews: sequelize.literal("(SELECT COUNT(*) FROM Views v WHERE v.userId = User.id)"),
      totalPosts: sequelize.literal("(SELECT COUNT(*) FROM Posts p WHERE p.userId = User.id)")
    };
  }
}

module.exports = (sequelize) => {
  User.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name: DataTypes.STRING,
      email: DataTypes.STRING,
    },
    { sequelize, modelName: "User" }
  );

  return User;
};
