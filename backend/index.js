import express from "express";
import cors from "cors";
import "dotenv/config";
import pg from "pg";
import * as cheerio from "cheerio";

const app = express();
app.use(cors());
app.use(express.json());

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test route - get all venues
app.get("/venues", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM venues ORDER BY id");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching venues:", error);
    res.status(500).json({ error: "Failed to fetch venues" });
  }
});

app.get("/availability", async (req, res) => {
  const isoDate = new Date().toISOString().slice(0, 10);
  const date = req.query.date || isoDate.replaceAll("-", "");

  try {
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

          // Step 1: Build the slots array
          slots.push({
            court: courtId,
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

        return {
          name: row.name,
          client_id: row.client_id,
          suburb: row.suburb,
          courts: courts,
        };
      }),
    );

    res.json(responses);
  } catch (error) {
    console.error("Error fetching availability:", error);
    res.status(500).json({ error: "Failed to fetch availability" });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
