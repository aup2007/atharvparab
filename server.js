import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from "./routes/auth.js"; 
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai"; 

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Increased limit for heavy payloads
app.use(express.json({ limit: '10mb' }));
app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:3000", "https://daidaex.vercel.app"],
    credentials: true
}));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- 🛠️ AI CONFIGURATION ---
// 1. Safety: Turns off filters so AI doesn't refuse to read names/descriptions.
const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

const modelConfig = {
    model: "gemini-2.0-flash", // ✅ Confirmed valid from your list
    safetySettings: safetySettings,
};

// --- HELPER: Robsut JSON Cleaner ---
// This prevents the "SyntaxError" crash if the AI adds text like "Here is the list:"
const cleanJSON = (text) => {
    try {
        const firstBracket = text.indexOf('[');
        const lastBracket = text.lastIndexOf(']');
        
        if (firstBracket === -1 || lastBracket === -1) return [];
        
        const jsonStr = text.substring(firstBracket, lastBracket + 1);
        return JSON.parse(jsonStr);
    } catch (err) {
        console.error("❌ JSON Parse Failed. Raw text was:", text); 
        return []; 
    }
};

// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`🚀 Backend Server running on http://localhost:${PORT}`);
    mongoose.connect(process.env.MONGO_URI)
        .then(() => console.log("🟢 MongoDB Connected Successfully"))
        .catch(err => console.error("🔴 MongoDB Connection Failed:", err));
});

let db = mongoose.connection;

app.use("/api/auth", authRoutes); 
app.get("/", (req, res) => res.send("✅ Server Ready"));

// --- STANDARD GET ROUTES ---
app.get("/api/architect-firms", async (req, res) => {
    try {
        const firms = await mongoose.connection.db.collection("ArchFirms").find({}).sort({ rank: 1 }).limit(100).toArray();
        console.log(`✅ Served ${firms.length} firms.`); 
        res.json(firms);
    } catch (err) { res.status(500).json({ error: "Failed to fetch firms" }); }
});

app.get("/api/projects", async (req, res) => {
    try {
        const projects = await mongoose.connection.db.collection("DBIA").find({}).limit(50).toArray();
        console.log(`✅ Served ${projects.length} projects.`); 
        res.json(projects);
    } catch (err) { res.status(500).json({ error: "Failed to fetch projects" }); }
});

app.get("/api/experts", async (req, res) => {
    try {
        const experts = await mongoose.connection.db.collection("experts").find({}).limit(50).toArray();
        const safeExperts = experts.map(e => ({ ...e, id: e.expertId || e._id }));
        console.log(`✅ Served ${safeExperts.length} experts.`); 
        res.json(safeExperts);
    } catch (err) { res.status(500).json({ error: "Failed to fetch experts" }); }
});

// --- 🧠 AI SEARCH: EXPERTS ---
app.post("/api/ai-search", async (req, res) => {
    try {
        const { query } = req.body;
        console.log(`🔍 AI Search Experts for: "${query}"`);

        const rawExperts = await mongoose.connection.db.collection("experts").find({}).limit(50).project({
            expertId: 1, name: 1, expertiseIn: 1, overview: 1
        }).toArray();

        const prompt = `
        Query: "${query}"
        Data: ${JSON.stringify(rawExperts)}
        Task: Return a JSON Array of objects with "id" and "score" (0-100) for the best matches.
        Example: [{"id": "123", "score": 90}]
        Return ONLY JSON. Do not use Markdown blocks.
        `;

        const model = genAI.getGenerativeModel(modelConfig);
        const result = await model.generateContent(prompt);
        const aiResults = cleanJSON(result.response.text()); 

        const matchedIds = aiResults.map(r => String(r.id));
        const dbResults = await mongoose.connection.db.collection("experts").find({ expertId: { $in: matchedIds } }).toArray();

        const final = dbResults.map(e => {
            const match = aiResults.find(r => String(r.id) === String(e.expertId));
            return { ...e, matchScore: match?.score || 0 };
        }).sort((a,b) => b.matchScore - a.matchScore);

        console.log(`✅ Found ${final.length} experts.`);
        res.json(final);
    } catch (err) {
        console.error("AI Expert Search Error:", err.message);
        res.json([]); 
    }
});

// --- 🧠 AI SEARCH: PROJECTS ---
app.post("/api/ai-search-projects", async (req, res) => {
    try {
        const { query } = req.body;
        console.log(`🔍 AI Search Projects for: "${query}"`);

        const rawProjects = await mongoose.connection.db.collection("DBIA").find({}).limit(80).toArray();
        const contextList = rawProjects.map(p => ({
            id: String(p.projectId || p._id),
            title: p.grid?.name || "Untitled",
            desc: p.details?.["Short Project Description"] || "",
            type: p.details?.Category?.[0] || ""
        }));

        const prompt = `
        Query: "${query}"
        Data: ${JSON.stringify(contextList)}
        Task: Return a JSON Array of objects with "id" and "score" (0-100).
        Example: [{"id": "123", "score": 90}]
        Return ONLY JSON. Do not use Markdown blocks.
        `;

        const model = genAI.getGenerativeModel(modelConfig);
        const result = await model.generateContent(prompt);
        const aiResults = cleanJSON(result.response.text());

        const matchedIds = aiResults.map(r => String(r.id));
        
        const dbResults = await mongoose.connection.db.collection("DBIA").find({
            $or: [
                { projectId: { $in: matchedIds.map(Number) } }, 
                { projectId: { $in: matchedIds } } 
            ]
        }).toArray();

        const final = dbResults.map(p => {
            const match = aiResults.find(r => String(r.id) === String(p.projectId));
            return { ...p, matchScore: match?.score || 0 };
        }).sort((a,b) => b.matchScore - a.matchScore);

        console.log(`✅ Found ${final.length} projects.`);
        res.json(final);
    } catch (err) {
        console.error("AI Project Search Error:", err.message);
        res.json([]);
    }
});

// --- 🧠 AI SEARCH: FIRMS (FIXED MAPPING) ---
app.post("/api/ai-search-firms", async (req, res) => {
    try {
        const { query } = req.body;
        console.log(`\n🔍 PROCESSING FIRM QUERY: "${query}"`);

        // 1. Fetch Data
        const rawFirms = await mongoose.connection.db.collection("ArchFirms").find({}).limit(50).toArray();

        // 2. Map Data correctly using YOUR database fields
        const contextList = rawFirms.map(f => ({
            id: String(f._id), 
            name: f.name || "Unknown Firm",
            // Send the introduction so AI understands the firm's specialty
            description: (f.introduction || "").substring(0, 300), 
            // Send project names so AI can match "airports" or "museums" even if not in the description
            projects: (f.prominent_projects || []).map(p => p.project).join(", ").substring(0, 300)
        }));

        const prompt = `
        Query: "${query}"
        Candidates: ${JSON.stringify(contextList)}
        
        Instructions: 
        1. Analyze the 'description' and 'projects' to find firms matching the query.
        2. Return a JSON Array of objects: [{"id": "id_string", "score": 90}]
        3. STRICTLY JSON.
        `;

        const model = genAI.getGenerativeModel(modelConfig);
        const result = await model.generateContent(prompt);
        const aiResults = cleanJSON(result.response.text());

        console.log(`📊 AI suggested ${aiResults.length} matches.`);

        const matchedIds = aiResults.map(r => String(r.id));
        
        // Filter and merge scores
        const dbResults = rawFirms.filter(f => matchedIds.includes(String(f._id)));

        const final = dbResults.map(f => {
            const match = aiResults.find(r => String(r.id) === String(f._id));
            return { ...f, matchScore: match?.score || 0 };
        }).sort((a,b) => b.matchScore - a.matchScore);

        console.log(`✅ Returned ${final.length} firms.`);
        res.json(final);

    } catch (err) {
        console.error("🔥 AI Firm Search CRASH:", err.message);
        res.json([]);
    }
});