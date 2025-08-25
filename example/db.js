const { Sequelize } = require("sequelize");
const Redis = require("redis");
const QueryBuilder = require("sequelize-qb");

// Initialize Sequelize (SQLite for demo)
const sequelize = new Sequelize("qb_demo_tmp", "root", "",{
  dialect: "mysql",
  host: "127.0.0.1",
  logging: false,
});

// Init Redis
const redis = Redis.createClient();
redis.connect();

// Init QueryBuilder with Redis
QueryBuilder.init(redis);

module.exports = { sequelize, redis };
