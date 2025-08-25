const { Model, DataTypes } = require("sequelize");

class Post extends Model {}

module.exports = (sequelize) => {
  Post.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      title: DataTypes.STRING,
      content: DataTypes.TEXT,
      userId: DataTypes.INTEGER,
    },
    { sequelize, modelName: "Post" }
  );

  return Post;
};
