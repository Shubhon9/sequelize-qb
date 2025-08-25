# Sequelize QueryBuilder

A **reusable query builder wrapper for Sequelize** with:

- Caching (Redis-based)  
- Virtual attributes (dynamic subqueries)  
- Filtering, sorting, pagination  
- Association inclusion  
- Automatic cache invalidation for read queries  

## Installation

```bash
npm install sequelize-query-builder
```
---

## 🔹 Purpose

Sequelize QueryBuilder simplifies repetitive queries and boosts performance by:

- Reducing duplicate query code  
- Adding **virtual attributes** (aggregates or subqueries) dynamically  
- Caching frequent read queries in Redis  
- Handling **filters, sorting, pagination, and associations** in a fluent API  

---

## ⚡ When to Use

- Your app has **reusable read queries** on models  
- You want **Redis caching** for performance  
- You want **virtual attributes** like `totalViews` or `totalPosts`  
- You frequently query **related models and associations**  

### ❌ When to Avoid

- Queries are **highly dynamic and rarely reused** (caching may not help)  
- For **write-heavy workloads** only (QueryBuilder primarily optimizes reads; write caching must be handled carefully)  
- When you need **complex aggregations or raw SQL**, QueryBuilder may not cover everything  

---

## 📦 Installation

```bash
npm install sequelize-query-builder
```

## ⚙️ Initialization

QueryBuilder requires a Redis client to enable caching.

```javascript
const { createClient } = require("redis");
const QueryBuilder = require("sequelize-query-builder");

const redis = createClient({ url: "redis://127.0.0.1:6379" });
await redis.connect();

// Initialize globally
QueryBuilder.init(redis);
```

## 🔹 Basic Usage

### Import and create a QueryBuilder instance

```javascript
const QueryBuilder = require("sequelize-query-builder");

// Assume User is a Sequelize model
const qb = new QueryBuilder(User);
```

### 1️⃣ Select columns (including virtual attributes)

```javascript
const users = await qb
  .select(["id", "name", "totalViews"]) // totalViews is a virtual attribute
  .findAll();
```

### 2️⃣ Filtering

```javascript
const activeUsers = await qb
  .filter({ status: "active" })
  .findAll();
```

### 3️⃣ Sorting

```javascript
const sortedUsers = await qb
  .sort([["createdAt", "DESC"]])
  .findAll();
```

### 4️⃣ Pagination

```javascript
const paginatedUsers = await qb
  .paginate({ page: 2, pageSize: 5 })
  .findAll();
```

### 5️⃣ Associations

```javascript
const usersWithPosts = await qb
  .include([
    { model: Post, attributes: ["id", "title"] },
    { model: View, attributes: ["page"] }
  ])
  .findAll();
```

### 6️⃣ Caching

```javascript
const cachedUsers = await qb
  .cache(60) // cache results for 60 seconds
  .findAll();
```

Cache uses namespace-based keys, automatically invalidated when `QueryBuilder.invalidate()` is called.

### 7️⃣ Cache Invalidation

```javascript
// Invalidate cache for a model and related models
await QueryBuilder.invalidate("User", ["Post", "View"]);
```

- Increments namespace version in Redis to automatically expire old cache entries
- Useful after updates or deletions

## 🔹 Advanced Example

```javascript
const qb = new QueryBuilder(User);

const users = await qb
  .select(["id", "name", "totalPosts", "totalViews"]) // virtual attributes
  .filter({ status: "active" })
  .include([{ model: Post, attributes: ["title"] }])
  .sort([["createdAt", "DESC"]])
  .paginate({ page: 1, pageSize: 10 })
  .cache(120) // 2 minutes
  .findAll();

console.log(users);
```

## 🔹 QueryBuilder Methods Compatibility

| QueryBuilder Method | Sequelize Feature | Compatibility | Notes |
|---|---|---|---|
| `.select([...])` | `attributes` | ✅ Fully | Works with real and virtual attributes (via sequelize.literal). |
| `.filter({...})` | `where` | ✅ Fully | Supports Sequelize operators (Op.gt, Op.or, etc.). |
| `.include([...])` | `include` | ✅ Fully | Supports associations, nested includes, through, required. |
| `.sort([...])` | `order` | ✅ Fully | Works with multiple columns and associations. |
| `.paginate({ page, pageSize })` | `limit + offset` | ✅ Fully | Sets limit and offset correctly. |
| `.cache(ttl)` | n/a | ✅ Fully | External Redis caching, does not modify Sequelize functionality. |
| `.findAll(options)` | `findAll` | ✅ Fully | Respects all QueryBuilder options, caching optional. |
| `.findOne(options)` | `findOne` | ✅ Fully | Respects all QueryBuilder options, caching optional. |
| `.log(true/false)` | n/a | ✅ Fully | Only console logging, no effect on Sequelize. |
| `.enableGlobalLogging(true/false)` | n/a | ✅ Fully | Global console logging. |
| `.invalidate(modelName, relatedModels)` | n/a | ✅ Fully | Invalidates cached read queries for models and related models. |
| `.create(data, options)` | `create` | ⚠️ Partial | Not wrapped by default; must manually invalidate cache if used. |
| `.update(values, options)` | `update` | ⚠️ Partial | Not wrapped; call `QueryBuilder.invalidate()` after updates. |
| `.destroy(options)` | `destroy` | ⚠️ Partial | Not wrapped; call `QueryBuilder.invalidate()` after deletions. |
| `.scope(...)` | Sequelize scopes | ⚠️ Partial | Can pass via options to findAll, QueryBuilder does not automatically handle scopes. |
| `.raw` | `findAll({ raw: true })` | ⚠️ Partial | Works if passed manually; virtual attributes may need adjustment. |
| `.aggregate` | `count`, `sum`, `max` | ❌ Not supported | QueryBuilder focuses on findAll/findOne; aggregates must use Sequelize directly. |

### ✅ Summary

- **Green ✅** → Fully supported, works out of the box
- **Yellow ⚠️** → Partially supported, manual adjustments needed  
- **Red ❌** → Not supported, use Sequelize directly

## ⚠️ Notes & Tips

**Virtual attributes**: define in your model as:

```javascript
User.virtualAttributes = (sequelize) => ({
  totalViews: sequelize.literal(`(SELECT COUNT(*) FROM Views v WHERE v.userId = User.id)`),
  totalPosts: sequelize.literal(`(SELECT COUNT(*) FROM Posts p WHERE p.userId = User.id)`)
});
```

- **Write operations** (create, update, destroy) are not automatically cached. Call `QueryBuilder.invalidate()` after writes if needed.
- Works with **SQLite, MySQL, PostgreSQL**. Make sure Sequelize is configured properly.
- **Logging** can be enabled per query or globally:

```javascript
QueryBuilder.enableGlobalLogging(true);
qb.log(true);
```

## 🔹 Summary

QueryBuilder makes Sequelize queries:

- **Reusable** ✅
- **Cached** ✅  
- **Easy to maintain** ✅
- **Safe for read-heavy operations** ✅

## 📖 License

MIT License
