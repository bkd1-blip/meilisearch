require("dotenv").config();
const express = require("express");
const { MeiliSearch } = require("meilisearch");
const { Pool } = require("pg");
const { getFeedQuery, getUserQuery } = require("./sql/feed.js");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,

  // Pool management
  max: 20,
  min: 4, // Minimum number of clients to keep in pool
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 5000,
  maxUses: 7500, // Maximum times a connection can be reused
  keepAlive: true, // Enable TCP keep-alive
  keepAliveInitialDelayMillis: 30000, // Start sending keep-alive after 30s
});
const client = new MeiliSearch({
  host: process.env.MEILI_HOST,
  apiKey: process.env.MEILI_API_KEY,
});

app.post("/sync-feeds", async (req, res) => {
  try {
    const { rows } = await pool.query(getFeedQuery);
    console.log({ rows });
    const index = client.index("feeds");
    await index.updateSearchableAttributes([
      "attributes.title",
      "attributes.subtitle",
      "attributes.body",
      "attributes.creator.data.attributes.firstName",
      "attributes.creator.data.attributes.lastName",
    ]);
    await index.updateSortableAttributes(["attributes.createdAt"]);
    await index.updateFilterableAttributes([
      "attributes.type",
      "attributes.created_by",
      "attributes.comments_by_user",
      "attributes.typeId",
    ]);
    const result = await index.addDocuments(rows);
    res.json({ message: "Feeds synced", indexed: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/delete-index", async (req, res) => {
  try {
    const { indexName } = req.body;

    const index = client.index(indexName);
    await index.deleteAllDocuments();

    res.json({ message: `Documents deleted for ${indexName}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/sync-people", async (req, res) => {
  try {
    const { rows } = await pool.query(getUserQuery);

    const index = client.index("people");
    await index.updateSearchableAttributes([
      "firstName",
      "lastName",
      "displayName",
      "role",
    ]);
    await index.updateSortableAttributes(["createdAt"]);
    await index.updateFilterableAttributes([
      "firstName",
      "lastName",
      "displayName",
      "role",
      "connections",
      "interests",
    ]);
    const result = await index.addDocuments(rows);
    res.json({ message: "Feeds synced", indexed: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
