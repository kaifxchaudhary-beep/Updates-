/**
 * ⚡ AUTO FORWARD PLUGIN (OPTIMIZED)
 */

module.exports = (sock, config = {}) => {

    // -------------------------------------------------------------------------
    // CONFIG
    // -------------------------------------------------------------------------
    const SOURCE_JIDS = config.SOURCE_JIDS || [];
    const TARGET_JIDS = config.TARGET_JIDS || [];
    const OLD_TEXT_REGEX = config.OLD_TEXT_REGEX || [];
    const NEW_TEXT = config.NEW_TEXT || '';

    // -------------------------------------------------------------------------
    // HELPERS
    // -------------------------------------------------------------------------

    function cleanForwardedLabel(message) {
        try {
            if (!message || typeof message !== 'object') return message;

            const msg = { ...message };

            const paths = [
                'extendedTextMessage',
                'imageMessage',
                'videoMessage',
                'audioMessage',
                'documentMessage'
            ];

            paths.forEach(type => {
                if (msg[type]?.contextInfo) {
                    msg[type].contextInfo.isForwarded = false;
                    if (msg[type].contextInfo.forwardingScore) {
                        msg[type].contextInfo.forwardingScore = 0;
                    }
                }
            });

            return msg;
        } catch (e) {
            console.error('cleanForwardedLabel error:', e);
            return message;
        }
    }

    function cleanNewsletterText(text) {
        if (!text) return text;

        const markers = [
            /📢\s*/g,
            /🔔\s*/g,
            /📰\s*/g,
            /\[NEWSLETTER\]/gi,
            /\[BROADCAST\]/gi,
            /Forwarded message/gi,
            /Forwarded many times/gi
        ];

        let result = text;

        markers.forEach(m => {
            result = result.replace(m, '');
        });

        return result.trim();
    }

    function replaceCaption(text) {
        if (!text) return text;
        if (!OLD_TEXT_REGEX.length || !NEW_TEXT) return text;

        let result = text;

        OLD_TEXT_REGEX.forEach(regex => {
            result = result.replace(regex, NEW_TEXT);
        });

        return result;
    }

    function processMessage(message) {
        try {
            if (!message) return message;

            const msg = cleanForwardedLabel(message);

            const text =
                msg.conversation ||
                msg.extendedTextMessage?.text ||
                msg.imageMessage?.caption ||
                msg.videoMessage?.caption ||
                msg.documentMessage?.caption;

            if (text) {
                const cleanedText = cleanNewsletterText(text);

                if (msg.conversation) {
                    msg.conversation = cleanedText;
                }

                if (msg.extendedTextMessage?.text) {
                    msg.extendedTextMessage.text = cleanedText;
                }

                if (msg.imageMessage?.caption) {
                    msg.imageMessage.caption = replaceCaption(cleanedText);
                }

                if (msg.videoMessage?.caption) {
                    msg.videoMessage.caption = replaceCaption(cleanedText);
                }

                if (msg.documentMessage?.caption) {
                    msg.documentMessage.caption = replaceCaption(cleanedText);
                }
            }

            delete msg.protocolMessage;

            return msg;
        } catch (err) {
            console.error('processMessage error:', err);
            return message;
        }
    }

    // -------------------------------------------------------------------------
    // MAIN HANDLER
    // -------------------------------------------------------------------------
    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const msg = messages[0];
            if (!msg?.message) return;

            const jid = msg.key.remoteJid;

            if (!SOURCE_JIDS.includes(jid)) return;

            const cleaned = processMessage(msg.message);

            for (const target of TARGET_JIDS) {
                try {
                    await sock.sendMessage(target, cleaned, {
                        quoted: msg
                    });
                } catch (err) {
                    console.error('Send error:', err);
                }
            }

        } catch (err) {
            console.error('Handler error:', err);
        }
    });

};
