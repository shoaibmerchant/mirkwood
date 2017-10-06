import request from 'request-promise-native';

class Http {
  static request({ url, method, json, headers, body }) {
    headers = headers ? this._parseHeaders(headers): false;

    return request({
      url,
      method,
      headers,
      body: (method !== 'GET') ? body : false,
      qs: (method === 'GET') ? body : false,
      json: (typeof body === 'object' && method !== 'GET') || json || false
    });
  }

  static _parseHeaders(headers) {
    let parsedHeaders = {};

    for (let key of Object.keys(headers)) {
      let parsedKey = key.match(/([A-Z][a-z]+)/g).join('-');
      parsedHeaders[parsedKey] = headers[key];
    }

    return parsedHeaders;
  }
}

export default Http;
