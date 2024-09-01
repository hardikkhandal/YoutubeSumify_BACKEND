const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const fs = require("fs");
const axios = require("axios");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegStatic = require("ffmpeg-static");
const { YoutubeTranscript } = require("youtube-transcript");
const { generateText } = require("../services/groqServices");
const { extractVideoId } = require("../helpers/extractVideoId");

// Replace with your Eleven Labs API key and voice ID
const API_KEY = "sk_463348fa85af75bd647633b9d6049d312152c9f5025763ff";
const VOICE_ID = "pMsXgVXv3BLzUgSXRplE"; // Example voice ID

router.use(bodyParser.json());

// Helper function to wait for the video to be created
function waitForVideoCreation(videoFile) {
  return new Promise((resolve, reject) => {
    const checkInterval = 1000; // Check every 1 second

    const checkFileExistence = setInterval(() => {
      if (fs.existsSync(videoFile)) {
        clearInterval(checkFileExistence);
        resolve();
      }
    }, checkInterval);

    // Timeout after 60 seconds
    setTimeout(() => {
      clearInterval(checkFileExistence);
      reject(new Error("Video creation timeout"));
    }, 60000);
  });
}

// Endpoint to create video summary
router.post("/video", async (req, res) => {
  console.log("Request body:", req.body);
  const { videoUrl } = req.body;
  console.log("Request received to summarize video:", videoUrl);
  const videoId = extractVideoId(videoUrl);

  const transcript = await YoutubeTranscript.fetchTranscript(videoId);

  // Extract only the text from each transcript entry
  const overlayText = transcript.map((entry) => entry.text).join(" ");

  if (!overlayText) {
    return res.status(400).json({ error: "Text is required" });
  }

  // Define file paths directly
  const audioDir = "audio";
  const backgroundImage = `${audioDir}/background.jpg`;
  const audioFile = `${audioDir}/output.mp3`;
  const videoFile = `${audioDir}/summary.mp4`;
  const fontFile = "/arial.ttf";

  // Ensure the audio directory exists or create it if it doesn't
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir);
  }

  try {
    // Generate speech from text using Eleven Labs API
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        text: overlayText,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      },
      {
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": API_KEY,
        },
        responseType: "arraybuffer", // Ensure response is in binary format
      }
    );

    // Save audio file
    fs.writeFileSync(audioFile, Buffer.from(response.data));
    console.log("Audio file saved successfully.");

    function getAudioDuration(filePath) {
      return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
          if (err) {
            reject(err);
          } else {
            const duration = metadata.format.duration;
            resolve(duration);
          }
        });
      });
    }

    const audioDuration = await getAudioDuration(audioFile);

    // Generate video with text overlay
    await new Promise((resolve, reject) => {
      ffmpeg()
        .setFfmpegPath(ffmpegStatic)
        .input(backgroundImage) // Input background image
        .loop(audioDuration) // Loop the image to match audio duration
        .input(audioFile) // Add audio file
        .audioCodec("aac")
        .audioBitrate("192k")
        .videoCodec("libx264")
        .outputOptions([
          "-vf",
          `drawtext=text='${overlayText.replace(
            /\n/g,
            "\\n"
          )}':fontfile='${fontFile}':fontcolor=white:fontsize=8:box=1:boxcolor=black@0.5:boxborderw=10:x=(w-text_w)/2:y=(h-text_h)/2:line_spacing=5`,
          "-shortest", // Ensures the output is cut to the shortest input (audio duration)
        ])
        .on("end", () => {
          console.log("Video generation complete");
          // fs.unlinkSync(audioFile); // Clean up audio file
          resolve();
        })
        .on("error", (err) => {
          console.error("Error during video generation:", err);
          reject(err);
        })
        .save(videoFile);
    });

    // Wait for video file to be ready
    await waitForVideoCreation(videoFile);

    res.json({ videoUrl: `http://localhost:3000/${videoFile}` });
  } catch (error) {
    console.error("Error creating video summary:", error);
    res.status(500).json({ error: "Failed to create video summary" });
  }
});

module.exports = router;
