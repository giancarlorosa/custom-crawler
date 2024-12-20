const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('node:fs');
const url = require('node:url');
const path = require('path');
const chalk = require('chalk');
const { boxedConfigMessage } = require('./src/utils');

const baseUrl = 'https://www.domain.io';
const subPage = 'null';
const pagesToScrap = 5000;

let pageList = [{
    url: `${baseUrl}`,
    visited: false,
    statusCode: null,
    externalLink: false,
    documentLink: false,
    absoluteLink: false,
    hasAnchor: false,
    links: []
}];

function getPageToScrap() {
    notVisitedPages = pageList.filter(page => page.visited === false);
    return notVisitedPages.length > 0 ? notVisitedPages[0] : false;
}

function getPageByUrl(url) {
    pagesFound = pageList.filter(page => page.url === url);
    return pagesFound.length > 0 ? pagesFound[0] : false;
}

function isDocument(url) {
    const fileExtensions = ['.pdf', '.csv', '.mp4'];
    const urlExtension = url.slice(-4);

    return fileExtensions.indexOf(urlExtension) > -1;
}

function writeScrapResult(scrapData) {
    const absolutePath = path.resolve(__dirname, 'scrap_result.json');
    fs.writeFileSync(absolutePath, scrapData, 'utf8', (error) => {
        if (error) {
            console.error('An error occurred while writing to the file:', error);
            return;
        }
        console.log('File has been written successfully.');
    });
}

async function scrap(page){
    const internalPageLinks = [];

    try {
        const response = await axios.get(page.url);
        const responseUrl = response?.request.res.responseUrl;
        let pageHasAnchor = false;
        let checkingPageUrl = page.url;

        const pageUrlObg = new URL(page.url);
        const pagePathname = pageUrlObg.pathname;
        let scrapPage = true;

        if (subPage) {
            if (pagePathname.length < subPage.length) {
                scrapPage = false;
            }

            if (subPage.length === pagePathname.length && subPage !== pagePathname) {
                scrapPage = false;
            }

            if (pagePathname.length > subPage.length) {
                const pagePathNameComp = pagePathname.slice(0, subPage.length + 1);
                if (pagePathNameComp !== `${subPage}/` && pagePathNameComp !== `${subPage}#` && pagePathNameComp !== `${subPage}?`) {
                    scrapPage = false;
                }
            }
        }

        if (checkingPageUrl !== responseUrl) {
            checkingPageUrl = `${page.url} --> ${responseUrl}`;
        }

        if (scrapPage) {
            console.log(chalk.black.bgGreen('Scraping page'), checkingPageUrl);
        } else {
            console.log(chalk.white.bgRed('SKIP PAGE'), checkingPageUrl);
        }

        if (!page.externalLink && !page.documentLink && scrapPage && response.status === 200) {
            const $ = cheerio.load(response.data);
            const pageLinks = $('a');

            if (page.url.includes('#')) {
                const pageUrlSplit = page.url.split('#');
                const anchorId = pageUrlSplit[1];
                const anchorElement = $(`#${anchorId}`);

                pageHasAnchor = anchorElement.length > 0 ? true : 'error';
            }

            pageLinks.each((index, item) => {
                const pageUrl =  `${$(item).attr('href')}`;
                const urlFirstChart = pageUrl.charAt(0);
                const isDocumentLink = isDocument(pageUrl);

                let fullPageUrl = pageUrl;
                let isValidUrl = false;
                let isExternalLink = false;
                let isAbsoluteLink = false;

                if (urlFirstChart === '/' && pageUrl.length > 0) {
                    fullPageUrl = `${baseUrl}${pageUrl}`
                    isValidUrl = true;

                    // console.log('Internal page url: ', fullPageUrl);
                }

                if (pageUrl.slice(0,4) === 'http' && pageUrl.includes(baseUrl)) {
                    isValidUrl = true;
                    isAbsoluteLink = true;

                    // console.log('Absolute link: ', fullPageUrl);
                }

                if (pageUrl.slice(0,4) === 'http' && !pageUrl.includes(baseUrl)) {
                    isExternalLink = true;
                    isValidUrl = true;

                    // console.log('External page url: ', fullPageUrl);
                }

                if (isValidUrl && internalPageLinks.indexOf(fullPageUrl) === -1) {
                    internalPageLinks.push(fullPageUrl);

                    if (!getPageByUrl(fullPageUrl) && pageList.length < pagesToScrap) {
                        pageList.push({
                            url: fullPageUrl,
                            responseUrl: responseUrl,
                            visited: false,
                            statusCode: null,
                            externalLink: isExternalLink,
                            documentLink: isDocumentLink,
                            absoluteLink: isAbsoluteLink,
                            hasAnchor: false,
                            links: []
                        });
                    }
                }
            });
        }

        pageList = pageList.map(pageItem => {
            if (pageItem.url === page.url) {
                return { ...pageItem, responseUrl, visited: true, statusCode: page.url !== responseUrl ? 301 : 200, hasAnchor: pageHasAnchor, links: internalPageLinks }
            } else {
                return pageItem;
            }
        });

        if (!getPageByUrl(responseUrl) && pageList.length < pagesToScrap) {
            pageList.push({
                url: responseUrl,
                responseUrl: null,
                visited: false,
                statusCode: null,
                externalLink: false,
                documentLink: null,
                absoluteLink: false,
                hasAnchor: false,
                links: []
            });
        }
    } catch (error) {
        let statusCode = error.response?.status || 500;

        if (!error.response?.status) {
            console.log('ERROR NOT MAPPED: ', error);
        }

        pageList = pageList.map(pageItem => {
            if (pageItem.url === page.url) {
                return { ...pageItem, visited: true, statusCode }
            } else {
                return pageItem;
            }
        });

        if (!getPageByUrl(page.url) && pageList.length < pagesToScrap) {
            pageList.push({
                url: page.url,
                visited: true,
                statusCode,
                externalLink: false,
                documentLink: false,
                absoluteLink: false,
                hasAnchor: false,
                links: []
            });
        }
    }

    if (getPageToScrap()) {
        scrap(getPageToScrap());
    } else {
        writeScrapResult(JSON.stringify(pageList))
        console.log(boxedConfigMessage(
            'the Scraping process has been completed',
            {
                'Domain': baseUrl,
                'Search URL': subPage,
                'Pages crawled': pageList.length
            },
            false,
            true
        ));

        process.exit();
    }
}

scrap(pageList[0]);