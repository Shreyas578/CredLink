require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fileUpload = require("express-fileupload");
const apiRoutes = require("./routes/api");

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
}));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(fileUpload({
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    useTempFiles: false,
}));

// Routes
app.use("/api", apiRoutes);

// Health check
app.get("/health", (req, res) => {
    res.json({ status: "ok", service: "CredLink Oracle", timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
    console.error("[ERROR]", err.message);
    res.status(500).json({ error: err.message || "Internal server error" });
});

app.listen(PORT, () => {
    console.log(`\n🚀 CredLink Oracle running on http://localhost:${PORT}`);
    console.log(`   Ollama URL: ${process.env.OLLAMA_URL || "http://localhost:11434"}`);
    console.log(`   Model: ${process.env.OLLAMA_MODEL || "gemma:2b"}`);
});

module.exports = app;
