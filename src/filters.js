// Default requires
const fs = require('node:fs');
const chalk = require('chalk');

// Custom modules
const { getCrawledLinks } = require('./crawler');
const { boxedInfoMessage } = require('./utils');
const { projectsFolder, getProjectName } = require('./project_management');

function printFilterStats(baseUrl, filter, linkList) {
    let message = [];
    message.push(`Project: ${chalk.bold.cyanBright(baseUrl)}`);
    message.push(`Selected filter: ${chalk.bold.cyanBright(filter)}`);

    console.log(boxedInfoMessage(
        'Printing crawler stats for the following project',
        message.join("\n"),
        'Registers found: ' + chalk.bold.yellowBright(linkList.length),
        {
            type: 'info',
            marginTop: true,
            marginBottom: true
        }
    ));
}

function printFilterComplete(baseUrl, filter, linkList) {
    const terminalWidthSize = process.stdout.columns;
    let fullWidthLine = [];

    for (let i = 0; i < terminalWidthSize; i++) {
        fullWidthLine.push('');
    }

    if (linkList.length > 0) {
        console.log("\n");
    }

    linkList.forEach(link => {
        console.log(chalk.yellowBright(fullWidthLine.join('=')));
        console.log(chalk.bold.cyanBright('URL: ') + link.urlDestination);
        console.log(fullWidthLine.join('-'));

        if (link.urlOrigin) {
            console.log(chalk.bold.cyanBright('Origin: ') + link.urlOrigin);
        }
    });

    if (linkList.length > 0) {
        console.log(chalk.yellowBright(fullWidthLine.join('=')));
    }

    printFilterStats(baseUrl, filter, linkList);
}

function exportFilteredData(baseUrl, linkList, fileName) {
    if (!fileName || !Array.isArray(linkList) || linkList.length < 1) {
        return false;
    }

    const projectName = getProjectName(baseUrl);
    const fileHeader = ["URL;Origin"];
    const linkListFormatted = linkList.map(link => `${link.urlDestination};${link.urlOrigin}`);

    try {
        fs.writeFileSync(`./${projectsFolder}/${projectName}/exports/${fileName}.csv`, [...fileHeader, ...linkListFormatted].join("\n"), 'utf8');
        return true;
    } catch (error) {
        return false;
    }
}

function filterLinksWithError(baseUrl) {
    const linkList = getCrawledLinks(baseUrl);

    return linkList
        .filter(link =>
            link.statusCode !== 200
            && link.statusCode !== 301
            && link.documentLink === false
            && link.visited === true
        )
        .map(link => {
            return {
                urlDestination: link.responseUrl,
                urlOrigin: link.url,
                statusCode: link.statusCode
            }
        });
}

function filterDocumentsWithError(baseUrl) {
    const linkList = getCrawledLinks(baseUrl);

    return linkList
        .filter(link =>
            link.statusCode !== 200
            && link.statusCode !== 301
            && link.documentLink === true
            && link.visited === true
        )
        .map(link => {
            return {
                urlDestination: link.responseUrl,
                urlOrigin: link.url,
                statusCode: link.statusCode
            }
        });
}

function filterAnchorsWithError(baseUrl) {
    const linkList = getCrawledLinks(baseUrl);

    return linkList
        .filter(link =>
            link.missingAnchor === true
            && link.visited === true
        )
        .map(link => {
            return {
                urlDestination: link.responseUrl,
                urlOrigin: link.url,
                statusCode: link.statusCode
            }
        });
}

module.exports = {
    printFilterStats,
    printFilterComplete,
    exportFilteredData,
    filterLinksWithError,
    filterDocumentsWithError,
    filterAnchorsWithError
}