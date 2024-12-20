const fs = require('node:fs');
const path = require('path');
const chalk = require('chalk');
const { boxedConfigMessage } = require('./src/utils');

const absolutePath = path.resolve(__dirname, 'scrap_result.json');
const domain = 'https://www.domain.io'
const subPage = 'locations';
const urlSearch = `${domain}`;

const filterSelected = 'documentLinksWithError';
// const filterSelected = 'pagesWithDocumentLinks';
// const filterSelected = 'pagesWithError';
// const filterSelected = 'externalLinksWithError';

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
            && page.externalLink === false
            && page.responseUrl.includes(domain)
            // && (
            //     page.url.slice(0, urlSearch.length) === urlSearch
            //     || page.responseUrl.slice(0, urlSearch.length) === urlSearch
            // )
        })
    };
}

function getExternalLinksWithError() {
    return {
        'filterTitle': 'External Links with Error',
        'data': pageList.filter(page => {
            return page.statusCode !== 200
            && page.statusCode !== 301
            && page.externalLink === true
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
        'data': pageList.filter(page => page.documentLink === true && page.statusCode !== 200 && page.statusCode !== 301)
    };
}

function exportData(data, fileName) {
    // console.log(data);
    // return

    try {
        fs.writeFileSync(`./exports/${fileName}`, data, 'utf8');
        return true;
    } catch (error) {
        console.log(error)
        return false;
    }
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
    case 'externalLinksWithError':
        filterEnabled = getExternalLinksWithError();
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
    const mappedData = filterEnabled.data.map(link => {
        return `${link.responseUrl};${link.url};${link.statusCode}`
    })

    console.log(filterEnabled.data);
    // console.log(mappedData);

    exportData(mappedData.join("\n"), `${filterEnabled.filterTitle}.csv`);
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