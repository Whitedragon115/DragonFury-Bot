const fs = require('fs');

function writeConfig(name, value) {
    const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
    config[name] = value;
    fs.writeFileSync('./config.json', JSON.stringify(config, null, 4), 'utf-8');
}

function readConfig(name) {
    const file = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
    return file[name] ?? false;
}

module.exports = {
    writeConfig,
    readConfig
};