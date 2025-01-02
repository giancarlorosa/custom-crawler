// Default requires
const fs = require('node:fs');
const url = require('node:url');
const axios = require('axios');
const cheerio = require('cheerio');
const chalk = require('chalk');

// Custom modules
const {
    projectsFolder,
    getProjectName,
    getProjectConfig,
    getBaseDataObj
} = require('./project_management.js');
const { boxedInfoMessage } = require('./utils.js');

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

const isRestrictedLink = (pathname, baseUrl) => {
    const projectConfig = getProjectConfig(baseUrl);
    const folderRestriction = projectConfig.folderRestriction;
    const folderRestrictions = typeof folderRestriction === 'object' ? folderRestriction : [folderRestriction];
    let isRestrictedLink = false;

    if (!folderRestrictions) {
        return true;
    }

    // Sort restriction to set not includes to last.
    folderRestrictions.sort().reverse()

    folderRestrictions.forEach(restriction => {
        const restrictionFolder = restriction.trim();
        const firstCharacter = restriction.slice(0, 1);
        const lastCharacter = restriction.slice(-1);

        // Restriction includes
        if (firstCharacter !== '!') {
            const restrictionExactMatch = pathname.length === restrictionFolder.length && pathname === restrictionFolder;
            const folderRestrictionContains = restrictionFolder.slice(0, -1);

            // Exact match
            if (lastCharacter !== '*' && restrictionExactMatch) {
                isRestrictedLink = true;
            }

            // Contains
            if (lastCharacter === '*' && folderRestrictionContains === pathname.slice(0, folderRestrictionContains.length)) {
                isRestrictedLink = true;
            }
        }

        // Restriction does not includes
        if (firstCharacter === '!') {
            const folderRestrictionNotIncludes = restrictionFolder.slice(1);
            const restrictionExactMatch = pathname.length === folderRestrictionNotIncludes.length && pathname === folderRestrictionNotIncludes;
            const folderRestrictionContains = folderRestrictionNotIncludes.slice(0, -1);

            // Exact match
            if (lastCharacter !== '*' && restrictionExactMatch) {
                isRestrictedLink = false;
            }

            // Contains
            if (lastCharacter === '*' && folderRestrictionContains === pathname.slice(0, folderRestrictionContains.length)) {
                isRestrictedLink = false;
            }
        }
    });

    return isRestrictedLink;
}

const getValidUrl = (url, urlOrigin, baseUrl) => {
    if (!url || !urlOrigin || !baseUrl) {
        return false;
    }

    const urlFirstCharacter = url.slice(0, 1);
    const urlProtocol = url.slice(0, 4);

    if (urlFirstCharacter === '/' && url.length === 1) {
        return `${baseUrl}`;
    }

    if (urlFirstCharacter === '/' && url.length > 1) {
        return `${baseUrl}${url}`;
    }

    if (urlFirstCharacter === '?' || (urlFirstCharacter === '#' && url.length > 1)) {
        return `${urlOrigin}${url}`;
    }

    if (urlProtocol === 'http') {
        return url;
    }

    return false;
}

const getCrawledLinks = (baseUrl) => {
    try {
        const projectName = getProjectName(baseUrl);
        const projectData = fs.readFileSync(`${projectsFolder}/${projectName}/data/mapped_links.json`, 'utf8');
        return JSON.parse(projectData);
    } catch (error) {
        return false;
    }
}

const getLinkToCrawl = (baseUrl) => {
    const linkList = getCrawledLinks(baseUrl) || [];
    const linkNotVisited = linkList.filter(link => link.visited === false)[0];

    if (!linkNotVisited) {
        return false;
    }

    return linkNotVisited;
}

const linksExists = (url, linkList) => {
    return linkList.filter(link => link.url === url).length > 0;
}

const storeLinkList = (baseUrl, linkList) => {
    const projectName = getProjectName(baseUrl);

    try {
        fs.writeFileSync(`${projectsFolder}/${projectName}/data/mapped_links.json`, JSON.stringify(linkList), 'utf8');
        return true;
    } catch (error) {
        return false;
    }
}

function printCrawlingStats(baseUrl, linkList, testingLink = null, processedTime = null) {
    if (!linkList || linkList.length < 1) {
        return false;
    }

    const visitedLinks = linkList.filter(link => link.visited === true);
    const notVisitedLinks = linkList.filter(link => link.visited === false);
    const linksWithError = linkList.filter(link => link.statusCode !== 200 && link.statusCode !== 301 && link.visited === true);

    let title = `Running crawling process for ${baseUrl}`;
    let message = chalk.bold("Testing url: ") + testingLink;

    if (!testingLink) {
        title = `Crawling process finished for ${baseUrl}`;
        message = `Crawling process finished in ${chalk.bold.greenBright(`${processedTime} minutes`)}`;
    }

    let footNotes = [];
    footNotes.push('Links found: ' + chalk.bold.cyanBright(linkList.length));
    footNotes.push('Links tested: ' + chalk.bold.greenBright(visitedLinks.length));
    footNotes.push('Links to test: ' + chalk.bold.yellowBright(notVisitedLinks.length));
    footNotes.push('Links with error: ' + chalk.bold.redBright(linksWithError.length));

    console.clear();
    console.log(boxedInfoMessage(
        title,
        message,
        footNotes.join("\n"),
        testingLink ? 'warning' : 'success'
    ));
}

const crawlingProcessStarted = new Date();
const startCrawlingProcess = async (baseUrl, linkList = null) => {
    const projectConfig = getProjectConfig(baseUrl);
    const baseUrlObj = new URL(baseUrl);
    const linkToCrawl = linkList.filter(link => link.visited === false)[0];
    const visitedLinks = linkList.filter(link => link.visited === true);
    const urlObj = linkToCrawl ? new URL(linkToCrawl.url) : null;

    if (!projectConfig || !linkList || !linkToCrawl) {
        storeLinkList(baseUrl, linkList);

        const crawlingProcessEnded = new Date();
        const diffMs = (crawlingProcessEnded - crawlingProcessStarted)
        const diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000);

        printCrawlingStats(baseUrl, linkList, false, diffMins);

        return false;
    }

    printCrawlingStats(baseUrl, linkList, linkToCrawl.url);

    try {
        // Constants
        const response = await axios.get(linkToCrawl.url);
        const responseUrl = response?.request.res.responseUrl || null;
        const responseUrlObj = responseUrl ? new URL(responseUrl) : null;

        // Link Checks
        const redirectLink = urlObj.origin !== responseUrlObj.origin;
        const externalLink = urlObj.hostname !== baseUrlObj.hostname;
        const documentLink = isDocumentLink(linkToCrawl.url);
        const pageAnchor = urlObj.hash ? true : false;
        const pageAnchorId = urlObj.hash || false;

        // Variables
        let scrapPage = true;
        let missingAnchor = false;
        let linksToCrawl = [];
        let internalPageLinks = [];

        if (externalLink || documentLink) {
            scrapPage = false;
        }

        if (
            projectConfig.folderRestriction
            && !isRestrictedLink(urlObj.pathname, baseUrl)
            && !isRestrictedLink(responseUrlObj.pathname, baseUrl)
        ) {
            scrapPage = false;
        }

        if (scrapPage) {
            const $ = cheerio.load(response.data);
            const pageLinks = $('a');

            if (pageAnchor) {
                const anchorElement = $(pageAnchorId);
                missingAnchor = anchorElement.length > 0;
            }

            pageLinks.each((index, linkElement) => {
                const linkHref = $(linkElement).attr('href');
                const validUrl = getValidUrl($(linkElement).attr('href'), urlObj.href, baseUrl);
                const pagesCrawled = linkList.length + linksToCrawl.length;

                if (
                    validUrl
                    && !linksExists(validUrl, linkList)
                    && !internalPageLinks.includes(linkHref)
                    && (
                        (projectConfig.pageLimit === 0 && pagesCrawled < 5000) // Safety limit
                        || (projectConfig.pageLimit > 0 && pagesCrawled < projectConfig.pageLimit)
                    )
                ) {
                    linksToCrawl.push(getBaseDataObj(validUrl));
                    internalPageLinks.push(linkHref);
                }
            });
        }

        // @TODO: move the limit check to a new function.
        if (
            redirectLink
            && !externalLink
            && !documentLink
            && !linksExists(responseUrl, linkList)
            && (
                (projectConfig.pageLimit === 0 && linkList.length + linksToCrawl.length < 5000) // Safety limit
                || (projectConfig.pageLimit > 0 && linkList.length + linksToCrawl.length < projectConfig.pageLimit)
            )
        ) {
            linksToCrawl.push(getBaseDataObj(responseUrl));
        }

        const updatedLinkList = linkList.map(link => {
            if (link.url === linkToCrawl.url) {
                return {
                    ...getBaseDataObj(linkToCrawl.url),
                    responseUrl,
                    protocol: urlObj.protocol,
                    visited: true,
                    statusCode: redirectLink ? 301 : response.status,
                    externalLink,
                    documentLink,
                    pageAnchor,
                    missingAnchor,
                    // links: internalPageLinks
                }
            }

            return link;
        });

        if (visitedLinks.length % 50 === 0) {
            storeLinkList(baseUrl, [...updatedLinkList,...linksToCrawl]);
        }

        startCrawlingProcess(baseUrl, [...updatedLinkList,...linksToCrawl]);
    } catch (error) {
        const responseUrl = error.request?.res?.responseUrl || error.config.url;
        const statusCode = error?.code === 'ETIMEDOUT' ? 408 : error.status;

        const updatedLinkList = linkList.map(link => {
            if (link.url === error.config.url) {
                return {
                    ...getBaseDataObj(error.config.url),
                    responseUrl: responseUrl,
                    protocol: error.request.protocol,
                    visited: true,
                    statusCode: statusCode
                }
            }

            return link;
        });

        if (visitedLinks.length % 50 === 0) {
            storeLinkList(baseUrl, updatedLinkList);
        }

        startCrawlingProcess(baseUrl, updatedLinkList);
    }
}

module.exports = {
    startCrawlingProcess,
    getCrawledLinks,
    storeLinkList
}