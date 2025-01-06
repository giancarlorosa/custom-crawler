// Default requires
const box = require("cli-box");
const chalk = require("chalk");

const getSessionId = () => {
    return Date.now();
}

const boxedMessage = (message, config) => {
    const boxedMessage = box(config?.size || "30x5", {
        text: message,
        stretch: config?.stretch || true,
        autoEOL: config?.autoEOL || true,
        vAlign: config?.verticalAlign || "center",
        hAlign: config?.horizontalAlign || "center",
    });

    return boxedMessage;
}

const boxedInfoMessage = (title, message, footerNote = null, config) => {
    const colorSchema = {
        'info': {
            color: 'black',
            background: 'bgCyan'
        },
        'success': {
            color: 'black',
            background: 'bgGreen'
        },
        'error': {
            color: 'black',
            background: "bgRedBright"
        },
        'warning': {
            color: 'black',
            background: 'bgYellow'
        }

    };

    const boxType = config?.type ? config.type : config;
    const titleColor = colorSchema[boxType].color;
    const titleBackground = colorSchema[boxType].background;

    let horizontalRule = [];
    let messageArray = [];
    let boxedMessageArray = [];

    for (let i = 0; i < (title.length + 10); i++) {
        horizontalRule.push('-');
    }

    horizontalRule = horizontalRule.join('');

    if (config?.marginTop) {
        messageArray.push("\n");
    }

    boxedMessageArray.push(`#### ${chalk[titleColor][titleBackground](title.toUpperCase())} ####`);

    boxedMessageArray.push(horizontalRule);
    boxedMessageArray.push(message);

    if (footerNote) {
        boxedMessageArray.push(horizontalRule);
        boxedMessageArray.push(footerNote);
    }

    messageArray.push(boxedMessage(boxedMessageArray.join("\n"), {
        size: `10x1`,
        horizontalAlign: 'left'
    }))

    if (config?.marginBottom) {
        messageArray.push("\n");
    }

    return messageArray.join("\n");
}

const boxedConfigMessage = (title, configs, footerNote = null, marginTop = false, marginBottom = false) => {
    let message = [];

    if (typeof configs === 'object') {
        const configsObject = Object.entries(configs);

        for (const [key, value] of configsObject) {
            message.push(`  ${key}: ${chalk.bold.greenBright(value)}  `);
        }
    }

    if (typeof configs === 'string') {
        message.push(configs);
    }

    return boxedInfoMessage(
        title,
        message.join("\n"),
        footerNote,
        {
            type: 'success',
            marginTop,
            marginBottom
        }
    );
}

const isDocumentLink = (url) => {
    const documentExtensions = [
        // Document files
        '.doc',
        '.docx',
        '.txt',
        '.pdf',
        // Spreadsheet files
        '.csv',
        '.ods',
        '.xls',
        '.xlsx',
        //Audio and video files
        '.aif',
        '.mov',
        '.mp3',
        '.mp4',
        '.mpg',
        '.wav',
        '.wma',
        '.wmv'
    ];

    return documentExtensions.indexOf(url.slice(url.lastIndexOf('.'))) > -1;
}

module.exports = {
    boxedMessage,
    boxedInfoMessage,
    boxedConfigMessage,
    isDocumentLink,
    getSessionId
}