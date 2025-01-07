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
const { boxedInfoMessage, isDocumentLink } = require('./utils.js');

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

const getValidUrl = (url, urlOrigin) => {
    if (!url || !urlOrigin) {
        return false;
    }

    const urlFirstCharacter = url.slice(0, 1);
    const urlProtocol = url.slice(0, 4);

    if (urlFirstCharacter === '/' && url.length === 1) {
        return `${urlOrigin}`;
    }

    if (urlFirstCharacter === '/' && url.length > 1) {
        return `${urlOrigin}${url}`;
    }

    if (urlFirstCharacter === '?' || (urlFirstCharacter === '#' && url.length > 1)) {
        return `${urlOrigin}/${url}`;
    }

    if (urlProtocol === 'http') {
        return url;
    }

    return false;
}

function getCrawledLinks(baseUrl) {
    try {
        const projectName = getProjectName(baseUrl);
        const projectData = fs.readFileSync(`${projectsFolder}/${projectName}/data/mapped_links.json`, 'utf8');
        return JSON.parse(projectData);
    } catch (error) {
        return false;
    }
}

function getCrawledDataLinks(baseUrl, dataType) {
    try {
        const projectName = getProjectName(baseUrl);
        const projectData = fs.readFileSync(`${projectsFolder}/${projectName}/data/${dataType}.json`,"utf8");
        const parsedData = JSON.parse(`[${projectData.slice(0, -1)}]`);

        return parsedData.reduce((accumulator, currentValue) => {
            const alreadyAddedUrl = accumulator.filter((externalLink) => externalLink.url === currentValue.url)[0];

            if (alreadyAddedUrl) {
                const updatedExternalLink = accumulator.map((externalLink) => {
                    if (externalLink.url === currentValue.url && !externalLink.referencePages.includes(currentValue.reference)) {
                        return {
                            ...externalLink,
                            referencePages: [...externalLink.referencePages, currentValue.reference]
                        };
                    }

                    return externalLink;
                });

                return updatedExternalLink;
            }

            return [...accumulator, { url: currentValue.url, referencePages: [currentValue.reference] }];
        }, []);
    } catch (error) {
        console.log(error);
        return false;
    }
}

const linksExists = (url, linkList) => {
    return linkList.filter(link => link.url === url).length > 0;
}

function storeMappedLinks(baseUrl, linkList) {
    const projectName = getProjectName(baseUrl);

    try {
        fs.writeFileSync(`${projectsFolder}/${projectName}/data/mapped_links.json`, JSON.stringify(linkList), 'utf8');
        return true;
    } catch (error) {
        console.log(chalk.white.bgRed('ERROR?'), error)
        return false;
    }
}

function storeDataLinks(baseUrl, url, referenceLink, dataType) {
    const projectName = getProjectName(baseUrl);
    const fileData = `{"url":"${url}","reference":"${referenceLink}"},`;

    try {
        fs.appendFileSync(`${projectsFolder}/${projectName}/data/${dataType}.json`, fileData, 'utf8');
        return true;
    } catch (error) {
        console.log(chalk.white.bgRed('ERROR?'), error)
        return false;
    }
}

function storeRedirectLinks(baseUrl, url, responseUrl) {
    const projectName = getProjectName(baseUrl);
    const fileData = `{"url":"${url}","response":"${responseUrl}"},`;

    try {
        fs.appendFileSync(`${projectsFolder}/${projectName}/data/redirect_links.json`, fileData, 'utf8');
        return true;
    } catch (error) {
        console.log(chalk.white.bgRed('ERROR?'), error)
        return false;
    }
}

function printCrawlingStats(baseUrl, linkList, testingLink = null, processedTime = null) {
    if (!linkList || linkList.length < 1) {
        return false;
    }

    const visitedLinks = linkList.filter(link => link.vl === true);
    const notVisitedLinks = linkList.filter(link => link.vl === false);
    const linksWithError = linkList.filter(link => link.sc !== 200 && link.sc !== 301 && link.vl === true);

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
    const linkToCrawl = linkList.filter(link => link.vl === false)[0];

    if (!projectConfig || !linkList || !linkToCrawl) {
        storeMappedLinks(baseUrl, linkList);

        const crawlingProcessEnded = new Date();
        const diffMs = (crawlingProcessEnded - crawlingProcessStarted)
        const diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000);

        printCrawlingStats(baseUrl, linkList, false, diffMins);

        return false;
    }

    const visitedLinks = linkList.filter(link => link.vl === true);
    const linkToCrawlUrlObj = getValidUrl(linkToCrawl.url, baseUrl) ? new URL(getValidUrl(linkToCrawl.url, baseUrl)) : null;
    const externalLink = linkToCrawlUrlObj.hostname !== baseUrlObj.hostname;
    const documentLink = isDocumentLink(linkToCrawl.url);

    printCrawlingStats(baseUrl, linkList, linkToCrawl.url);

    try {
        // Constants
        const response = await axios.get(linkToCrawlUrlObj.href, { timeout: 15000 });
        const responseUrl = response?.request.res.responseUrl || null;
        const responseUrlObj = responseUrl ? new URL(responseUrl) : null;

        // Link Checks
        const redirectLink = linkToCrawlUrlObj.href !== responseUrlObj.href;
        const pageAnchorId = linkToCrawlUrlObj.hash || false;

        // Variables
        let scrapPage = true;
        let missingAnchor = false;
        let linksToCrawl = [];
        let internalPageLinks = [];

        if (externalLink || documentLink || redirectLink) {
            scrapPage = false;
        }

        // @TODO: Improve the restrict link function name.
        if (
            projectConfig.folderRestriction
            && !isRestrictedLink(linkToCrawlUrlObj.pathname, baseUrl)
            && !isRestrictedLink(responseUrlObj.pathname, baseUrl)
        ) {
            scrapPage = false;
        }

        if (scrapPage) {
            const $ = cheerio.load(response.data);
            const pageLinks = $('a');

            if (pageAnchorId) {
                const anchorElement = $(pageAnchorId);
                missingAnchor = anchorElement.length > 0;
            }

            pageLinks.each((index, linkElement) => {
                const linkHref = $(linkElement).attr('href');
                const validUrl = getValidUrl(linkHref, baseUrl);
                const pagesCrawled = linkList.length + linksToCrawl.length;
                const validInternalLink = validUrl ? validUrl.replace(baseUrl, '/').replace('://', ':///').replace('//', '/') : null;

                if (
                    validUrl
                    && !linksExists(validInternalLink, linkList)
                    && !internalPageLinks.includes(validInternalLink)
                    && (
                        (projectConfig.pageLimit === 0 && pagesCrawled < 5000) // Safety limit
                        || (projectConfig.pageLimit > 0 && pagesCrawled < projectConfig.pageLimit)
                    )
                ) {
                    const validUrlObj = new URL(validUrl);
                    const _externalLink = validUrlObj.hostname !== baseUrlObj.hostname;
                    const _documentLink = isDocumentLink(validUrl);
                    let dataType = null;

                    linksToCrawl.push(getBaseDataObj(validInternalLink));
                    internalPageLinks.push(validInternalLink);

                    switch(true) {
                        case (_externalLink && !_documentLink):
                            dataType = 'external_links';
                            break;
                        case (_externalLink && _documentLink):
                            dataType = 'external_documents';
                            break;
                        case (!_externalLink && !_documentLink):
                            dataType = 'internal_links';
                            break;
                        case (!_externalLink && _documentLink):
                            dataType = 'internal_documents';
                            break;
                        default:
                            dataType = null;
                            break;
                    }

                    if (dataType) {
                        storeDataLinks(baseUrl, validInternalLink, linkToCrawl.url, dataType);
                    }

                    if (linkHref.includes(baseUrl)) {
                        storeDataLinks(baseUrl, linkHref, linkToCrawl.url, 'absolute_links');
                    }
                }
            });
        }

        // @TODO: Move the limit check to a new function.
        if (
            redirectLink
            && !externalLink
            && !linksExists(responseUrl, linkList)
            && (
                (projectConfig.pageLimit === 0 && linkList.length + linksToCrawl.length < 100000) // Safety limit
                || (projectConfig.pageLimit > 0 && linkList.length + linksToCrawl.length < projectConfig.pageLimit)
            )
        ) {
            linksToCrawl.push(getBaseDataObj(responseUrlObj.href.replace(responseUrlObj.origin, '')));
            storeRedirectLinks(baseUrl, linkToCrawlUrlObj.pathname, responseUrlObj.pathname);
        }

        const updatedLinkList = linkList.map(link => {
            if (link.url === linkToCrawl.url) {
                return {
                    ...link,
                    vl: true,
                    sc: redirectLink ? 301 : response.status
                }
            }

            return link;
        });

        const newLinkListItems = [...updatedLinkList,...linksToCrawl];

        if (visitedLinks.length % 50 === 0) {
            storeMappedLinks(baseUrl, newLinkListItems);
        }

        startCrawlingProcess(baseUrl, newLinkListItems);
    } catch (error) {
        const responseUrl = error.request?.res?.responseUrl || null;
        const statusCode = error?.code === 'ETIMEDOUT' || error?.code === 'ECONNABORTED' ? 408 : error.status;

        const updatedLinkList = linkList.map(link => {
            if (link.url === linkToCrawl.url) {
                return {
                    ...link,
                    vl: true,
                    sc: statusCode || 500
                }
            }

            return link;
        });

        if (visitedLinks.length % 50 === 0) {
            storeMappedLinks(baseUrl, updatedLinkList);
        }

        startCrawlingProcess(baseUrl, updatedLinkList);
    }
}

module.exports = {
    startCrawlingProcess,
    getCrawledLinks,
    getCrawledDataLinks,
    getValidUrl,
    storeMappedLinks
}