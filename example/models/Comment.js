const { Model, DataTypes } = require("sequelize");

class Comment extends Model {}

module.exports = (sequelize) => {
  Comment.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      text: DataTypes.STRING,
      userId: DataTypes.INTEGER,
      postId: DataTypes.INTEGER,
    },
    { sequelize, modelName: "Comment" }
  );

  return Comment;
};
