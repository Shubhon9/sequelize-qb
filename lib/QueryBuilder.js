/**
 * QueryBuilder.js
 *
 * A reusable query builder wrapper for Sequelize.
 * Adds caching, virtual attributes (subqueries), filtering, sorting, pagination,
 * and automatic namespace-based cache invalidation using Redis.
 *
 * ----------------------------
 * Use Case:
 *
 * - You have Sequelize models and frequently run similar queries.
 * - You want to cache query results for improved performance.
 * - You want to add virtual attributes (e.g., total views, aggregate counts) dynamically.
 * - You want to log queries and cache hits/misses optionally.
 * - You want automatic cache invalidation for models and related models.
 *
 * Example usage:
 *
 * const Redis = require("redis");
 * const QueryBuilder = require("./QueryBuilder");
 * const redis = Redis.createClient();
 * await redis.connect();
 *
 * // Initialize global Redis client
 * QueryBuilder.init(redis);
 *
 * // Using the QueryBuilder with a User model
 * const qb = new QueryBuilder(User);
 *
 * const users = await qb
 *    .select(["id", "name", "totalViews"])   // virtual attribute added only if requested
 *    .filter({ status: "active" })          // add where clause
 *    .sort([["createdAt", "DESC"]])         // sorting
 *    .paginate({ page: 1, pageSize: 10 })   // pagination
 *    .cache(60)                             // cache results for 60s
 *    .findAll();                            // execute query
 *
 */

const crypto = require("crypto");  // for generating cache keys
const { Sequelize } = require("sequelize");

// Redis client placeholder; user must initialize via QueryBuilder.init()
let redisClient = null;

class QueryBuilder {
  // Global logging flag
  static globalLogging = false;

  /**
   * Constructor
   * @param {Model} model - Sequelize model
   */
  constructor(model) {
    if (!redisClient) {
      throw new Error("❌ Redis client not set. Call QueryBuilder.init(redis) first.");
    }

    this.model = model;

    // Default query object
    this.query = {
      where: {},       // Sequelize where clause
      include: [],     // Sequelize include associations
      attributes: null,// Selected columns
      order: [],       // Sorting
      limit: null,     // Pagination limit
      offset: null,    // Pagination offset
    };

    this.cacheTTL = null;  // Cache time-to-live in seconds
    this.logging = false;  // Local logging flag
  }

  /**
   * Initialize Redis client globally
   * Must be called before using QueryBuilder
   * @param {RedisClient} redis - instance of Redis client
   */
  static init(redis) {
    redisClient = redis;
  }

  /**
   * Enable local logging for this query
   * @param {boolean} enabled
   * @returns {QueryBuilder}
   */
  log(enabled = true) {
    this.logging = enabled;
    return this;
  }

  /**
   * Enable logging globally for all queries
   * @param {boolean} enabled
   */
  static enableGlobalLogging(enabled = true) {
    QueryBuilder.globalLogging = enabled;
  }

  /**
   * Add filters / where conditions
   * @param {object} filters - Sequelize where object
   * @returns {QueryBuilder}
   */
  filter(filters = {}) {
    Object.assign(this.query.where, filters);
    return this;
  }

  /**
   * Select specific attributes (columns)
   * Supports virtual attributes defined on the model
   * @param {string[]} attributes - array of attribute names
   * @returns {QueryBuilder}
   */
  select(attributes = []) {
    // Get virtual attributes from model
    const modelVirtuals = this.model.virtualAttributes
      ? this.model.virtualAttributes(this.model.sequelize)
      : {};

    const realAttrs = [];
    const virtualAttrs = [];

    for (const attr of attributes) {
      if (modelVirtuals[attr]) {
        virtualAttrs.push(attr);
      } else {
        realAttrs.push(attr);
      }
    }

    // Assign real attributes
    this.query.attributes = realAttrs.length ? realAttrs : null;

    // Include virtual attributes as Sequelize literals
    if (virtualAttrs.length) {
      if (!this.query.attributes) {
        this.query.attributes = { include: [] };
      } else if (Array.isArray(this.query.attributes)) {
        this.query.attributes = { include: realAttrs };
      } else if (!this.query.attributes.include) {
        this.query.attributes.include = [];
      }

      for (const v of virtualAttrs) {
        this.query.attributes.include.push([modelVirtuals[v], v]);
      }
    }

    return this;
  }

  /**
   * Include Sequelize associations
   * @param {array} associations - array of include objects
   * @returns {QueryBuilder}
   */
  include(associations = []) {
    this.query.include.push(...associations);
    return this;
  }

  /**
   * Sorting order
   * @param {array} order - Sequelize order array, e.g., [["createdAt", "DESC"]]
   * @returns {QueryBuilder}
   */
  sort(order = []) {
    this.query.order = order;
    return this;
  }

  /**
   * Pagination
   * @param {object} options - { page, pageSize }
   * @returns {QueryBuilder}
   */
  paginate({ page = 1, pageSize = 10 }) {
    this.query.limit = pageSize;
    this.query.offset = (page - 1) * pageSize;
    return this;
  }

  /**
   * Enable caching for the query
   * @param {number} ttlSeconds - cache TTL in seconds
   * @returns {QueryBuilder}
   */
  cache(ttlSeconds = 60) {
    this.cacheTTL = ttlSeconds;
    return this;
  }

  /**
   * Determines if logging is enabled
   * @returns {boolean}
   */
  _shouldLog() {
    return this.logging || QueryBuilder.globalLogging;
  }

  /**
   * Get current namespace version for caching
   * @param {string} modelName
   * @returns {number}
   */
  async _getNamespaceVersion(modelName = this.model.name) {
    const key = `ns:${modelName}`;
    let version = await redisClient.get(key);
    if (!version) {
      version = 1;
      await redisClient.set(key, version);
    }
    return version;
  }

  /**
   * Generate a cache key based on model, query, and namespace version
   * @param {string} method - findAll / findOne
   */
  async _getCacheKey(method) {
    const version = await this._getNamespaceVersion(this.model.name);
    const keyData = {
      model: this.model.name,
      version,
      method,
      query: this.query,
    };
    return crypto.createHash("md5").update(JSON.stringify(keyData)).digest("hex");
  }

  /**
   * Check if result exists in cache
   * @param {string} key
   * @returns {object|null}
   */
  async _checkCache(key) {
    const cached = await redisClient.get(key);
    if (cached) {
      if (this._shouldLog()) console.log(`✅ Cache HIT for ${this.model.name} [${key}]`);
      return JSON.parse(cached);
    }
    if (this._shouldLog()) console.log(`❌ Cache MISS for ${this.model.name} [${key}]`);
    return null;
  }

  /**
   * Store result in cache
   * @param {string} key
   * @param {object} value
   */
  async _setCache(key, value) {
    if (this.cacheTTL) {
      await redisClient.setEx(key, this.cacheTTL, JSON.stringify(value));
      if (this._shouldLog()) {
        console.log(`💾 Cache SET for ${this.model.name} [${key}] (TTL: ${this.cacheTTL}s)`);
      }
    }
  }

  /**
   * Execute a findAll query
   * @param {object} options - additional Sequelize options
   */
  async findAll(options = {}) {
    const key = this.cacheTTL ? await this._getCacheKey("findAll") : null;

    if (key) {
      const cached = await this._checkCache(key);
      if (cached) return cached;
    }

    const result = await this.model.findAll({ ...this.query, ...options });

    if (key) await this._setCache(key, result);

    return result;
  }

  /**
   * Execute a findOne query
   * @param {object} options - additional Sequelize options
   */
  async findOne(options = {}) {
    const key = this.cacheTTL ? await this._getCacheKey("findOne") : null;

    if (key) {
      const cached = await this._checkCache(key);
      if (cached) return cached;
    }

    const result = await this.model.findOne({ ...this.query, ...options });

    if (key) await this._setCache(key, result);

    return result;
  }

  /**
   * Invalidate cache for a model and optionally related models
   * @param {string} modelName
   * @param {array} relatedModels
   * @param {boolean} logging
   */
  static async invalidate(modelName, relatedModels = [], logging = false) {
    // Increment namespace version for main model
    const key = `ns:${modelName}`;
    const current = await redisClient.get(key);
    const next = current ? parseInt(current) + 1 : 1;
    await redisClient.set(key, next);

    if (logging || QueryBuilder.globalLogging) {
      console.log(`♻️ Cache INVALIDATED for ${modelName}`);
    }

    // Increment namespace version for related models
    for (const rel of relatedModels) {
      const relKey = `ns:${rel}`;
      const relCurrent = await redisClient.get(relKey);
      const relNext = relCurrent ? parseInt(relCurrent) + 1 : 1;
      await redisClient.set(relKey, relNext);

      if (logging || QueryBuilder.globalLogging) {
        console.log(`♻️ Cache INVALIDATED for related ${rel}`);
      }
    }
  }
}

module.exports = QueryBuilder;
