// Default requires

const getBaseDataObj = (url, protocol) => {
    return {
        'url': url,
        'protocol': protocol,
        'visited': false,
        'statusCode': null,
        'externalLink': false,
        'documentLink': null,
        'absoluteLink': false,
        'pageAnchor': null,
        'links': []
    }
}

module.exports = { getBaseDataObj }