import elasticsearch from 'elasticsearch'

export default class ElasticSearch {
  constructor({config}) {
    this.config = config[process.env['NODE_ENV'] || 'development'];
    if (!this.config) {
      this.client = null;
      return;
    }
    this.client = new elasticsearch.Client({
      host: [
        this.config.host, this.config.port || 9200
      ].join(':')
    });
  }
  index(typeName, id, body) {
    return this
      .search(typeName, {
      "query": {
        "match": {
          "_id": id
        }
      }
    })
      .then(res => {
        if (res.hits.total !== 0) {
          return this
            .client
            .update({index: this.config.index, type: typeName, id: id, body: body});
        }
        return this
          .client
          .create({index: this.config.index, type: typeName, id: id, body: body});
      })
  }
  search(modelName, match) {
    return new Promise((resolve, reject) => {
      this
        .client
        .search({index: this.config.index, type: modelName, body: match})
        .then(res => {
          const response = {
            total: res.hits.total,
            maxScore: res.hits.max_score,
            hits: res
              .hits
              .hits
              .map(hit => ({_id: hit._id, source: hit._source, score: hit._score}))
          }
          resolve(response);
        })
        .catch(err => {
          reject(err);
        })
    })
  }
}