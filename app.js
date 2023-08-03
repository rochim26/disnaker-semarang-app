const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const bodyParser = require("body-parser");
const FormData = require("form-data");

const app = express();

// Parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// Parse application/json
app.use(bodyParser.json());

// Sample URL for scraping job listings
const url = "https://disnaker.semarangkota.go.id/user/daftarLowongan";

// Function to scrape job listings from the provided URL
async function scrapeJobListings(html) {
  try {
    const $ = cheerio.load(html);

    const jobListings = [];
    const pages = [];

    // Customize the selector according to your HTML structure
    $(".card-lowongan-baru").each((index, element) => {
      const title = $(element).find(".card-header").text().trim();
      const company = $(element).find("img").attr("src");
      const id = $(element).find("input[type='button']").attr("id");
      const endDate = $(element)
        .find(".card-title")
        .text()
        .trim()
        .replace("Batas Lowongan", "");
      jobListings.push({ title, company, endDate, id });
    });

    // Customize the selector according to your HTML structure
    $(".page-item").each((index, element) => {
      const href = $(element).find("a").attr("href");
      const page = $(element).find("a").text().trim();
      const srOnly = $(element).find(".sr-only").text().trim();
      pages.push({ href, page, srOnly });
    });

    pages.pop();

    return { jobListings, pages };
  } catch (error) {
    console.error("Error scraping data:", error.message);
    return [];
  }
}

app.set("view engine", "ejs");

// Route to display the job listings on the homepage
app.get("/", async (req, res) => {
  const response = await axios.get(url);

  const jobListings = await scrapeJobListings(response.data);

  res.render("index", { jobListings });
});

// Route to handle AJAX request for job details
app.post("/get_detail_lowongan", async (req, res) => {
  const { id } = req.body;

  console.log(id);

  try {
    // Create a new FormData instance
    const formData = new FormData();
    formData.append("idlowongan", id);

    const response = await axios.post(
      "https://disnaker.semarangkota.go.id/Pop_up/get_detail_lowongan",
      formData,
      {
        headers: formData.getHeaders(), // Set appropriate headers for multipart/form-data
      }
    );

    res.send(response.data);
  } catch (error) {
    console.error("Error while fetching data:", error.message);
    res.send("Error while fetching data.");
  }
});

// Route to display the search results page with job listings based on keyword search
app.get("/cari-lowongan", async (req, res) => {
  const { keyword } = req.query;

  try {
    // Create a new FormData instance
    const formData = new FormData();
    formData.append("keyword", keyword);

    const response = await axios.post(
      "https://disnaker.semarangkota.go.id/user/search_lowongan",
      formData,
      {
        headers: formData.getHeaders(), // Set appropriate headers for multipart/form-data
      }
    );

    // Use Cheerio to parse the HTML content
    const html = response.data;

    const jobListings = await scrapeJobListings(html);

    // Render the .ejs template and pass the job listings data
    res.render("cari-lowongan", { jobListings, keyword });
  } catch (error) {
    console.error("Error while fetching data:", error.message);
    res.send("Error while fetching data.");
  }
});

// Route to handle the search form submission and redirect to the search results page
app.post("/search_lowongan", async (req, res) => {
  const { keyword } = req.body;

  res.redirect(`/cari-lowongan?keyword=${keyword}`);
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
