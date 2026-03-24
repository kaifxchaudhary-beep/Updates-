/**
 * ⚡ WASI-LIGHT-MD ⚡
 * Cleaner Utility
 * Powered by Mr Wasi (ixxwasi)
 */
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
}

const OLD_TEXT_REGEX = process.env.OLD_TEXT_REGEX
    ? process.env.OLD_TEXT_REGEX.split(',').map(pattern => {
        try {
            if (!pattern.trim()) return null;
            // Escape literal text to prevent crash from characters like ( ) [ ] * +
            const escaped = escapeRegex(pattern.trim());
            // Use 'u' flag for better unicode/stylish font support
            return new RegExp(escaped, 'gu');
        } catch (e) {
            console.error(`Invalid regex pattern: ${pattern}`, e);
            return null;
        }
      }).filter(regex => regex !== null)
    : [];

const NEW_TEXT = process.env.NEW_TEXT || '';

/**
 * Clean forwarded label and newsletter markers
 */
function processAndCleanMessage(message) {
    try {
        if (!message) return message;
        let cleaned = JSON.parse(JSON.stringify(message));
        
        // Remove forwarded flags
        const targetBlocks = ['extendedTextMessage', 'imageMessage', 'videoMessage', 'audioMessage', 'documentMessage'];
        targetBlocks.forEach(block => {
            if (cleaned[block]?.contextInfo) {
                cleaned[block].contextInfo.isForwarded = false;
                cleaned[block].contextInfo.forwardingScore = 0;
            }
        });

        // Replace text/captions
        const replaceText = (text) => {
            if (!text || !OLD_TEXT_REGEX.length) return text;
            let result = text;
            OLD_TEXT_REGEX.forEach(regex => {
                result = result.replace(regex, NEW_TEXT);
            });
            return result;
        };

        if (cleaned.conversation) cleaned.conversation = replaceText(cleaned.conversation);
        if (cleaned.extendedTextMessage) cleaned.extendedTextMessage.text = replaceText(cleaned.extendedTextMessage.text);
        if (cleaned.imageMessage) cleaned.imageMessage.caption = replaceText(cleaned.imageMessage.caption);
        if (cleaned.videoMessage) cleaned.videoMessage.caption = replaceText(cleaned.videoMessage.caption);
        if (cleaned.documentMessage) cleaned.documentMessage.caption = replaceText(cleaned.documentMessage.caption);

        return cleaned;
    } catch (e) {
        console.error('Cleaning Error:', e.message);
        return message;
    }
}

module.exports = { processAndCleanMessage };
