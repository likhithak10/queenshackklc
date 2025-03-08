// config.js

// For demonstration, let's say you have a "Gemini" or "OpenAI" style endpoint
// that uses an API key. We store it here:
const AI_API_KEY = "AIzaSyAowmFZTHAbYSklbVYutub6WSUggifxeNs"; // Hardcoded

// The base URL for your AI. For instance, a hypothetical Gemini endpoint:
const AI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

// The model you want to use, e.g. "gemini-2.0-flash" or "gpt-3.5-turbo"
const AI_MODEL_NAME = "gemini-2.0-flash";

// Expose these for other scripts
// (In Manifest V3, we can just load config.js before background.js)
