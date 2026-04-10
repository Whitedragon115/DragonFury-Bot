const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const OUTPUT_DIR = path.join(__dirname, '..', 'zips');

const FILES = [
    'index.js',
    'config.json',
    'package.json',
    'prisma.config.ts',
    '.env'
];

const FOLDERS = [
    'commands',
    'events',
    'function',
    'utils',
    'prisma',
    'trigger'
];

// Ensure output directory exists
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '');
const zipName = `DisBot-${timestamp}.zip`;
const output = fs.createWriteStream(path.join(OUTPUT_DIR, zipName));
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
    console.log(`Archive created: ${zipName}`);
    console.log(`Total bytes: ${archive.pointer()}`);
});

archive.on('warning', (err) => {
    if (err.code === 'ENOENT') {
        console.warn(err.message);
    } else {
        throw err;
    }
});

archive.on('error', (err) => {
    throw err;
});

archive.pipe(output);

for (const file of FILES) {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: file });
    } else {
        // console.warn(`Skipping missing file: ${file}`);
    }
}

for (const folder of FOLDERS) {
    const folderPath = path.join(__dirname, folder);
    if (fs.existsSync(folderPath)) {
        archive.directory(folderPath, folder);
    } else {
        // console.warn(`Skipping missing folder: ${folder}`);
    }
}

archive.finalize();



