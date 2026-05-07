import * as ftp from "basic-ftp";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

// Load environment variables from .env
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function deploy() {
    const client = new ftp.Client();
    client.ftp.verbose = true;

    try {
        console.log("🚀 Starting FTP deployment...");

        const config = {
            host: process.env.FTP_HOST,
            user: process.env.FTP_USER,
            password: process.env.FTP_PASSWORD,
            port: parseInt(process.env.FTP_PORT || "21"),
            secure: false, // Set to true if your server supports FTPS
        };

        if (!config.host || !config.user || !config.password) {
            throw new Error("❌ FTP credentials are missing in .env file.");
        }

        await client.access(config);
        console.log("✅ Connected to FTP server.");

        const remoteDir = process.env.FTP_REMOTE_DIR || "/public_html/";
        console.log(`📂 Ensuring remote directory exists: ${remoteDir}`);
        await client.ensureDir(remoteDir);

        const localDistPath = path.resolve(__dirname, "../dist");
        console.log(`📤 Uploading from: ${localDistPath}`);
        
        await client.clearWorkingDir(); // Optional: clears the remote directory before upload
        await client.uploadFromDir(localDistPath);

        console.log("🎉 Deployment successful!");
    } catch (err) {
        console.error("❌ Deployment failed:", err);
        process.exit(1);
    } finally {
        client.close();
    }
}

deploy();
