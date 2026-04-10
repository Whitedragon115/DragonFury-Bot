const fs = require('node:fs/promises');
const path = require('node:path');

const ZIP_DIR = path.join(__dirname, '..', 'zips');
const UPLOAD_URL = 'https://tmpfiles.org/api/v1/upload';

async function getLatestZipFile(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const zipFiles = entries.filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.zip'));

    if (zipFiles.length === 0) {
        throw new Error(`No .zip files found in ${dir}`);
    }

    let latest = null;

    for (const file of zipFiles) {
        const filePath = path.join(dir, file.name);
        const stats = await fs.stat(filePath);

        if (!latest || stats.mtimeMs > latest.mtimeMs) {
            latest = {
                name: file.name,
                path: filePath,
                mtimeMs: stats.mtimeMs,
                size: stats.size
            };
        }
    }

    return latest;
}

function toDirectDownloadUrl(url) {
    return url.replace(/^https?:\/\/tmpfiles\.org\//i, 'https://tmpfiles.org/dl/');
}

async function uploadFileToTmpfiles(file) {
    const fileBuffer = await fs.readFile(file.path);
    const fileBlob = new Blob([fileBuffer], { type: 'application/zip' });
    const formData = new FormData();
    formData.append('file', fileBlob, file.name);

    const response = await fetch(UPLOAD_URL, {
        method: 'POST',
        body: formData,
        headers: {
            'User-Agent': 'ZipUploader/1.0'
        }
    });

    const body = await response.text();

    if (!response.ok) {
        throw new Error(`Upload failed (${response.status} ${response.statusText}): ${body}`);
    }

    let parsed;
    try {
        parsed = JSON.parse(body);
    } catch {
        throw new Error(`Unexpected response from tmpfiles.org: ${body.trim()}`);
    }

    if (!parsed || parsed.status !== 'success' || !parsed.data || typeof parsed.data.url !== 'string') {
        throw new Error(`Upload did not return a valid URL: ${body.trim()}`);
    }

    return {
        pageUrl: parsed.data.url,
        directUrl: toDirectDownloadUrl(parsed.data.url)
    };
}

async function main() {
    const latestZip = await getLatestZipFile(ZIP_DIR);

    console.log(`Latest zip: ${latestZip.name}`);
    console.log(`Size: ${latestZip.size} bytes`);

    const result = await uploadFileToTmpfiles(latestZip);
    console.log(`Uploaded URL: ${result.pageUrl}`);
    console.log(`Direct URL: ${result.directUrl}`);
}

main().catch((error) => {
    console.error(`Error: ${error.message}`);
    process.exit(1);
});
