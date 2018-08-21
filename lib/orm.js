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
      // Use columnType if specified, overriding auto mapping
      const columnType = field.columnType || ORM.entityColumnType(field.type);

      // skip virtualf fields
      if (field.virtual) {
        return;
      }

      const entityColumn = {
        type: columnType,
      };

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

    const fieldTypeString = fieldType.toString();

    // check for primitive types
    switch (fieldTypeString) {
      case 'String':
        return 'varchar';
        break;
      case 'Int':
        return 'int';
        break;
      case 'Float':
        return 'float';
      case 'ID':
        return 'varchar';
      case 'Boolean':
        return 'boolean';
    }

    // check for enum\
    const isEnum = Types.isOfType(fieldType, 'GraphQLEnumType');

    if (isEnum) {
      return 'varchar'; // not using enums as of now
    }

    // check for objects
    if (Types.isOfType(fieldType, 'GraphQLObjectType')) {
      return 'simple-json';
    }

    // check for array
    const isArray = Types.isOfType(fieldType, 'GraphQLList');
    
    if (isArray) {
      const fieldBaseType = fieldType.ofType;
      if (Types.isOfType(fieldBaseType, 'GraphQLObjectType')) {
        return 'simple-json';
      }
      return 'simple-array';
    }

    // default return type
    return 'varchar';
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
      subscribers: dbConfig.subscribers || [],
      synchronize: false,
      entities: this.entities,
      logging: dbConfig.logging && true,
    };

    return createConnection(connConfig);
  }

  getConnection() {
    return getConnection();
  }
}

export default ORM;
