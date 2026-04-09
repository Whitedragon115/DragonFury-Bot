function uuid(format){
    const availChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let uuid = '';
    for (let i = 0; i < format.length; i++) {
        if (format[i] === 'x') {
            const randomIndex = Math.floor(Math.random() * availChars.length);
            uuid += availChars[randomIndex];
        } else {
            uuid += format[i];
        }
    }
    return uuid;
}

function sizeFormat(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
    return `${(bytes / (1024 ** i)).toFixed(2)} ${sizes[i]}`;
}

module.exports = {
    uuid,
    sizeFormat
}