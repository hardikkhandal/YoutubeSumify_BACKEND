const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const generateRoute = require("./api/generate");
const summarizeRoute = require("./api/summarize");
const questionRoute = require("./api/question");
const videosummary = require("./api/videosummary");

const app = express();
const port = 3000;

app.use(cors());

app.use(bodyParser.json());

app.use("/api", generateRoute);
app.use("/api", summarizeRoute);
app.use("/api", questionRoute);
app.use("/api", videosummary);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
