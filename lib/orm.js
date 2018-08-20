import { EntitySchema, createConnection, getConnection } from 'typeorm';
import { mapKeys } from 'lodash';

const DEFAULT_CONNECTION = 'development';
const DEFAULT_ADAPTER = 'postgres';

class ORM {
  constructor({ config }) {
    this.entities = [];
    this.config = config;
    this.getConnection = this.getConnection.bind(this);
  }

  initialize({name, models }) {
    mapKeys(models, model => {
      const { schema } = model;
      this.entities.push(ORM.schemaToEntity(schema));
    });
    // create connection with typeorm
    this.connect(name);
  }

  static schemaToEntity(schema) {
    const { name, datasource, fields } = schema;

    const ormEntitySchema = {
      name,
      tableName: datasource.collection || name,
      synchronize: datasource.synchronize || false, // forced
      columns : {}
    };

    mapKeys(fields, (field, fieldKey) => {
      const columnType = ORM.entityColumnType(field.type.toString());
      const entityColumn = {
        type: columnType,
      };

      if (fieldKey === '_id') {
        entityColumn.primary = true;
        entityColumn.generated = 'uuid';
      }
      ormEntitySchema.columns[fieldKey] = entityColumn;
    });

    return new EntitySchema(ormEntitySchema);
  }

  // converts mirkwood/graphql types to orm types
  static entityColumnType(fieldType) {
    switch (fieldType) {
      case 'String':
        return 'varchar';
        break;
      case '[ String ]':
        return 'simple-arary';
      case '[ ID ]':
        return 'simple-array';
      case 'Int':
        return 'int';
        break;
      case 'Float':
        return 'float';
      case 'ID':
        return 'varchar';
      default:
        return 'varchar';
        break;
    }
  }

  connect(name) {
    const connectionName = name || process.env['NODE_ENV'] || 'development';
    const dbConfig = this.config[connectionName];
    
    // sanitize options
    let ormAdapter = dbConfig.adapter || 'DEFAULT_ADAPTER';
    if (ormAdapter === 'postgresql') {
      ormAdapter = 'postgres';
    }

    const connConfig = {
      type: ormAdapter,
      host: dbConfig.host,
      port: dbConfig.port,
      username: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      synchronize: false,
      entities: this.entities,
    };

    return createConnection(connConfig);
  }

  getConnection() {
    return getConnection();
  }
}

export default ORM;
