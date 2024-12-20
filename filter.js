const fs = require('node:fs');
const path = require('path');
const chalk = require('chalk');
const { boxedConfigMessage } = require('./src/utils');

const absolutePath = path.resolve(__dirname, 'scrap_result.json');
const domain = 'https://www.domain.io'
const subPage = 'locations';
const urlSearch = `${domain}/${subPage}/services`;

// const filterSelected = 'documentLinksWithError';
// const filterSelected = 'pagesWithDocumentLinks';
const filterSelected = 'pagesWithError';

let pageList = JSON.parse(fs.readFileSync(absolutePath, { encoding: 'utf8' }));

function getPageByUrl(url) {
    return pageList.filter(page => page.url === url);
}

function getPagesWithError() {
    return {
        'filterTitle': 'Pages with Error',
        'data': pageList.filter(page => {
            return page.statusCode !== 200
            && page.statusCode !== 301
            && (
                page.url.slice(0, urlSearch.length) === urlSearch
                || page.responseUrl.slice(0, urlSearch.length) === urlSearch
            )
        })
};
}

function getPagesWithRedirect() {
    return {
        'filterTitle': 'Pages with Redirect',
        'data': pageList.filter(page => page.statusCode === 301)
    };
}

function getPagesWithDocumentLinks() {
    const documentLinksObj = getDocumentLinksWithError().data;

    if (documentLinksObj.length < 0) {
        return false;
    }

    const documentLinks = documentLinksObj.map(document => {
        return document.url;
    });

    return {
        'filterTitle': 'Pages with Document links',
        'data': pageList.filter(page => page.links.some(link => documentLinks.includes(link)))
    };
}

function getDocumentLinksWithError() {
    return {
        'filterTitle': 'Document Links with Error',
        'data': pageList.filter(page => page.documentLink === true && page.statusCode !== 200)
    };
}

// Default List filter
let filterEnabled = null;

// List of filters
switch (filterSelected) {
    case 'pagesWithError':
        filterEnabled = getPagesWithError();
        break;
    case 'documentLinksWithError':
        filterEnabled = getDocumentLinksWithError();
        break;
    case 'pagesWithDocumentLinks':
        filterEnabled = getPagesWithDocumentLinks();
        break;
    default:
        filterEnabled = {
            'filterTitle': 'Filters are disabled',
            'data': []
        }
        break;

}

// Filter result data
if (filterEnabled.data.length) {
    console.log(filterEnabled.data);
}

// Filter result stats
console.log(boxedConfigMessage(
    `${filterEnabled.filterTitle} - results related`,
    {
        'Domain': domain,
        'Search URL': urlSearch.replace(domain, ''),
        'Items with problems': filterEnabled.data.length,
        'Pages crawled': pageList.length
    }
));