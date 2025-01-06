// Default requires
const fs = require('node:fs');
const chalk = require('chalk');

// Custom modules
const { getCrawledLinks, getCrawledDataLinks, getValidUrl } = require('./crawler');
const { boxedInfoMessage, isDocumentLink } = require('./utils');
const { projectsFolder, getProjectName } = require('./project_management');

function printFilterStats(baseUrl, filterTitle, resultsCount) {
    let message = [];
    message.push(`Project: ${chalk.bold.cyanBright(baseUrl)}`);
    message.push(`Selected filter: ${chalk.bold.cyanBright(filterTitle)}`);

    let footerNotes = [];
    footerNotes.push(`Links with Issue: ${chalk.bold.yellowBright(resultsCount.issues)}`);
    footerNotes.push(`Pages with Issue: ${chalk.bold.yellowBright(resultsCount.pages)}`);

    console.log(boxedInfoMessage(
        'Printing crawler stats for the following project',
        message.join("\n"),
        footerNotes.join("\n"),
        {
            type: 'info',
            marginTop: true,
            marginBottom: true
        }
    ));
}

function exportFilteredData(baseUrl, data, fileName) {
    if (!fileName || !data) {
        return false;
    }

    try {
        const projectName = getProjectName(baseUrl);
        fs.writeFileSync(`./${projectsFolder}/${projectName}/exports/${fileName}.csv`, data, 'utf8');
        return true;
    } catch (error) {
        return false;
    }
}

function filterLinksWithError(baseUrl) {
    const mappedLinks = getCrawledLinks(baseUrl);
    const internalLinks = getCrawledDataLinks(baseUrl, 'internal_links');
    const externalLinks = getCrawledDataLinks(baseUrl, 'external_links');
    const linksToMap = [...internalLinks, ...externalLinks];
    const filteredData = mappedLinks.filter(link =>
        link.sc !== 200
        && link.sc !== 301
        && link.vl === true
        && !isDocumentLink(link.url)
    )

    const foundLinks = filteredData.map(link => link.url);
    const dataToExport = linksToMap.reduce((accumulator, currentItem) => {
        let linksTpExport = accumulator;
        if (foundLinks.includes(currentItem.url)) {
            const mappedLinkItem = mappedLinks.filter(link => link.url === currentItem.url)[0];

            if (mappedLinkItem) {
                currentItem.referencePages.forEach(referenceUrl => {
                    linksTpExport.push(`${getValidUrl(referenceUrl, baseUrl)};${mappedLinkItem.url};${mappedLinkItem.sc}`);
                })
            }
        }

        return linksTpExport;
    }, []);

    return {
        title: 'Links with error - WITHOUT documents',
        data: filteredData,
        exportData: `Page Location;URL with Issue;Status\n${dataToExport.join("\n")}`,
        total: {
            issues: filteredData.length,
            pages: dataToExport.length
        },
    };
}

function filterDocumentsWithError(baseUrl) {
    const mappedLinks = getCrawledLinks(baseUrl);
    const internalLinks = getCrawledDataLinks(baseUrl, 'internal_documents');
    const externalLinks = getCrawledDataLinks(baseUrl, 'external_documents');
    const linksToMap = [...internalLinks, ...externalLinks];
    const filteredData = mappedLinks.filter(link =>
        link.sc !== 200
        && link.sc !== 301
        && link.vl === true
        && isDocumentLink(link.url)
    )

    const foundLinks = filteredData.map(link => link.url);
    const dataToExport = linksToMap.reduce((accumulator, currentItem) => {
        let linksTpExport = accumulator;
        if (foundLinks.includes(currentItem.url)) {
            const mappedLinkItem = mappedLinks.filter(link => link.url === currentItem.url)[0];

            if (mappedLinkItem) {
                currentItem.referencePages.forEach(referenceUrl => {
                    linksTpExport.push(`${getValidUrl(referenceUrl, baseUrl)};${mappedLinkItem.url};${mappedLinkItem.sc}`);
                })
            }
        }

        return linksTpExport;
    }, []);

    return {
        title: 'Document links with error',
        data: filteredData,
        exportData: `Page Location;URL with Issue;Status\n${dataToExport.join("\n")}`,
        total: {
            issues: filteredData.length,
            pages: dataToExport.length
        },
    };
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
    exportFilteredData,
    filterLinksWithError,
    filterDocumentsWithError,
    filterAnchorsWithError
}