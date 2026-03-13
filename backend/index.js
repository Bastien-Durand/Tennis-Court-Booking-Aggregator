import express from "express";
import cors from "cors";
import "dotenv/config";
import pg from "pg";
import * as cheerio from "cheerio";

const app = express();
app.use(cors());
app.use(express.json());

const cache = {};
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

const getCacheKey = (date) => {
  return `availability_${date}`;
};

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

app.get("/availability", async (req, res) => {
  const isoDate = new Date().toISOString().slice(0, 10);
  const date = req.query.date || isoDate.replaceAll("-", "");

  try {
    const cacheKey = getCacheKey(date);
    if (
      cache[cacheKey] &&
      Date.now() - cache[cacheKey].timestamp < CACHE_DURATION
    ) {
      console.log("Serving from cache");
      return res.json(cache[cacheKey].data);
    }
    const result = await pool.query("SELECT * FROM venues ORDER BY id");
    const responses = await Promise.all(
      result.rows.map(async (row) => {
        const slots = [];
        const url = `https://www.tennisvenues.com.au/booking/${row.client_id}/fetch-booking-data?client_id=${row.client_id}&venue_id=${row.venue_id}&date=${date}`;
        const response = await fetch(url);
        const html = await response.text();
        const $ = cheerio.load(html);
        $("a[href*='/booking/request']").each((i, el) => {
          const href = $(el).attr("href");
          const courtId = new URLSearchParams(href.split("?")[1]).get("id");
          const courtMap = {
            "2c90811783403f3c01834381408b0001": "C7",
            "2c90811783403f3c01834381408f0002": "C8",
          };

          const court = courtMap[courtId] || courtId;

          // Step 1: Build the slots array
          slots.push({
            court: court,
            time: $(el).text(),
            link: `https://www.tennisvenues.com.au${href}`,
          });
        });

        const courts = {};
        slots.forEach((slot) => {
          if (!courts[slot.court]) {
            courts[slot.court] = [];
          }
          courts[slot.court].push({ time: slot.time, link: slot.link });
        });

        const sortedCourts = {};
        Object.keys(courts)
          .sort((a, b) => {
            const numA = parseInt(a.replace("C", "")) || 999;
            const numB = parseInt(b.replace("C", "")) || 999;
            return numA - numB;
          })
          .forEach((key) => {
            sortedCourts[key] = courts[key];
          });

        return {
          name: row.name,
          client_id: row.client_id,
          suburb: row.suburb,
          courts: sortedCourts,
        };
      }),
    );
    cache[cacheKey] = { data: responses, timestamp: Date.now() };
    res.json(responses);
  } catch (error) {
    console.error("Error fetching availability:", error);
    res.status(500).json({ error: "Failed to fetch availability" });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
