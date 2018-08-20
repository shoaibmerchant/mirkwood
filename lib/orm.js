//@ts-check
import { EntitySchema, createConnection, getConnection } from 'typeorm';
import { mapKeys, map, values } from 'lodash';
import Types from './types';
const DEFAULT_CONNECTION = 'development';
const DEFAULT_ADAPTER = 'postgres';
class ORM {
  constructor({ config }) {
    this.entities = [];
    this.config = config;
    this.getConnection = this.getConnection.bind(this);
  }

  initialize({name, models }) {
    const tempEntities = [];

    // const filteredModels = models.some(model => model.schema.name === 'User' || model.schema.name === 'Order' );
    mapKeys(models, (model) => {
      const { schema } = model;
      tempEntities.push(ORM.schemaToEntity(schema));
    });

    map(tempEntities, (entity) => { //Models
      const relations = entity.relations || {};

      if (relations) {
        mapKeys(relations, (relation, relationKey) => {// Model -> Relations
          // find target entity
          const targetEntity = tempEntities.find(entity => relation.target === entity.name)
        
          const tgRelations = targetEntity.relations || {};

          const foundTargetRelation = values(tgRelations).find(tgRelation => 
            tgRelation.target === entity.name
              && tgRelation.joinColumn.name  === relation.joinColumn.name);
          
          if (foundTargetRelation) {
            if (foundTargetRelation.type === 'one-to-many') {
              foundTargetRelation.inverseSide = relationKey;
            }
          } else {
            if (relation.type === 'one-to-one' ) {
              // creating relation on parent table for children
              const newRelationKey = [entity.name.toLowerCase(), relation.joinColumn.name].join('_');
              targetEntity.relations[newRelationKey] = {
                type: "one-to-many",
                target: entity.name,
                joinColumn: relation.joinColumn,
                inverseSide: relationKey
              };
            } else if (relation.type === 'one-to-many') {
              // creating relation on parent table for children
              const newRelationKey = [entity.name.toLowerCase(), relation.joinColumn.name].join('_');
              targetEntity.relations[newRelationKey] = {
                type: "one-to-one",
                target: entity.name,
                joinColumn: relation.joinColumn,
              };
            }
          }
        });
      }
    });

    this.entities = tempEntities.map(tempEntity => new EntitySchema(tempEntity));

    // create connection with typeorm
    this.connect(name);
  }

  static schemaToEntity(schema) {
    const { name, datasource, fields } = schema;

    const ormEntitySchema = {
      name,
      tableName: datasource.collection || name,
      synchronize: datasource.synchronize || false, // forced
      columns : {},
      relations: {...this.generateRelations(schema.relations)}
    };

    mapKeys(fields, (field, fieldKey) => {
      const columnType = ORM.entityColumnType(field.type.toString());
      const entityColumn = {
        type: columnType,
      };
      // console.log(fieldKey);

      if (fieldKey === '_id') {
        entityColumn.primary = true;
        entityColumn.generated = 'uuid';
      }
      const ignoreFields = ['_parent'];
      if (!ignoreFields.includes(fieldKey)) {
        ormEntitySchema.columns[fieldKey] = entityColumn;
      }
    });
    return ormEntitySchema;
  }

  static generateRelations(relations) {
    let newRelations = {};
    if (relations && relations.children) {
      const children = relations.children;
      children.map((row) => {
        const {schema} = Types.model(row.model);
        newRelations[row.name] = {
          type: 'one-to-many',
          target: schema.name,
          joinColumn: {
            name: row.field,
            referencedColumnName: row.joinBy
          }
        }
      })
    }

    if (relations && relations.parent) {
      const parent = relations.parent;
      parent.map((row) => {
        const {schema} = Types.model(row.model);
        newRelations[row.name] = {
          type: 'one-to-one',
          target: schema.name,
          joinColumn: {
            name: row.joinBy,
            referencedColumnName: row.field
          }
        }
      })
    }
    return newRelations;
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
    let ormAdapter = dbConfig.adapter || DEFAULT_ADAPTER;
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
      logging: true
    };

    return createConnection(connConfig);
  }

  getConnection() {
    return getConnection();
  }
}

export default ORM;
