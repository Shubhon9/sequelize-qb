const { sequelize } = require("./db");
// const QueryBuilder = require("../index");
const QueryBuilder = require("sequelize-qb");
const defineUser = require("./models/User");
const defineView = require("./models/View");
const definePost = require("./models/Post");
const defineComment = require("./models/Comment");

(async () => {
  // Define models
  const User = defineUser(sequelize);
  const View = defineView(sequelize);
  const Post = definePost(sequelize);
  const Comment = defineComment(sequelize);

  // Associations
  User.hasMany(View, { foreignKey: "userId" });
  User.hasMany(Post, { foreignKey: "userId" });
  User.hasMany(Comment, { foreignKey: "userId" });

  Post.belongsTo(User, { foreignKey: "userId" });
  Post.hasMany(Comment, { foreignKey: "postId" });

  Comment.belongsTo(User, { foreignKey: "userId" });
  Comment.belongsTo(Post, { foreignKey: "postId" });

//   await sequelize.sync({ force: true });

//   // Seed sample data
//   const alice = await User.create({ name: "Alice", email: "alice@test.com" });
//   const bob = await User.create({ name: "Bob", email: "bob@test.com" });

//   await Post.bulkCreate([
//     { title: "Alice Post 1", content: "Content 1", userId: alice.id },
//     { title: "Alice Post 2", content: "Content 2", userId: alice.id },
//     { title: "Bob Post 1", content: "Content 3", userId: bob.id }
//   ]);

//   await View.bulkCreate([
//     { userId: alice.id, page: "home" },
//     { userId: alice.id, page: "dashboard" },
//     { userId: bob.id, page: "home" }
//   ]);

//   await Comment.bulkCreate([
//     { text: "Great post!", userId: bob.id, postId: 1 },
//     { text: "Thanks!", userId: alice.id, postId: 1 },
//     { text: "Nice article", userId: alice.id, postId: 3 }
//   ]);

  // -----------------------------
  // Examples
  // -----------------------------

  // 1️⃣ Simple query with virtual attribute
  const usersWithStats = await new QueryBuilder(User)
    .select(["id", "name", "totalViews", "totalPosts"])
    .findAll();
  console.log("Users with stats:", JSON.stringify(usersWithStats, null, 2));

  // 2️⃣ Filtering + Sorting
  const postsByAlice = await new QueryBuilder(Post)
    .filter({ userId: alice.id })
    .sort([["title", "DESC"]])
    .findAll();
  console.log("Alice's posts:", JSON.stringify(postsByAlice, null, 2));

  // 3️⃣ Include associations (Post -> Comments)
  const postsWithComments = await new QueryBuilder(Post)
    .include([{ model: Comment, attributes: ["text"] }])
    .findAll();
  console.log("Posts with comments:", JSON.stringify(postsWithComments, null, 2));

  // 4️⃣ Pagination
  const paginatedUsers = await new QueryBuilder(User)
    .select(["id", "name"])
    .paginate({ page: 1, pageSize: 1 })
    .findAll();
  console.log("Paginated users:", JSON.stringify(paginatedUsers, null, 2));

  // 5️⃣ Caching
  const cachedUsers = await new QueryBuilder(User)
    .select(["id", "name", "totalViews"])
    .cache(30)
    .findAll();
  console.log("Cached users:", JSON.stringify(cachedUsers, null, 2));

  // 6️⃣ Cache invalidation
  await QueryBuilder.invalidate("User", ["View", "Post"]);
  console.log("Cache invalidated for User + related View/Post");

  process.exit(0);
})();
