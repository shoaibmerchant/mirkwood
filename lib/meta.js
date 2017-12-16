import Resolver from './resolver';
import Types from './types';
import { TypeNotFoundError } from '../errors';
import { keys, keyBy, values, map, cloneDeep, filter } from 'lodash';

class Meta {

  static get Type() {
		return Types.generateType({
			name: 'Meta',
			fields: {
				name: {
					type: Types.String,
					required: true
				},
        fields: {
          type: [Meta.FieldType]
        },
        _child: {
          type: [Meta.RelationType]
        },
        _children: {
          type: [Meta.RelationType]
        },
        _parent: {
          type: [Meta.RelationType]
        }
			}
		});
	}

  static get RelationType() {
    return Types.generateType({
      name: 'MetaRelation',
      fields: () => ({
        name: {
          type: Types.String
        },
        type: {
          type: Types.String
        },
        meta: {
          type: Meta.Type
        }
      })
    });
  }

  static get FieldType() {
    return Types.generateType({
      name: 'MetaField',
      fields: {
        name: {
          type: Types.String,
          required: true
        },
        type: {
          type: Types.String,
          required: true
        },
        resolved: {
          type: Types.Boolean
        },
        description: {
          type: Types.String
        },
        label: {
          type: Types.String
        },
        placeholder: {
          type: Types.String
        },
        query: {
          type: Types.String
        },
        precision: {
          type: Types.Int
        },
        hidden: {
          type: Types.Boolean
        },
        descriptor: {
          type: Types.String,
          defaultValue: 'text'
        },
        required: {
          type: Types.Boolean
        },
        min: {
          type: Types.Float
        },
        max: {
          type: Types.Float
        },
        step: {
          type: Types.Float
        },
        len: {
          type: Types.Int
        },
        pattern: {
          type: Types.String
        },
        unique: {
          type: Types.Boolean
        },
        keys: {
          type: [Types.String]
        },
        values: {
          type: [Types.String]
        },
        sort: {
          type: Types.Boolean
        },
        filter: {
          type: Types.Boolean
        },
        control: {
          type: Types.String
        },
        icon: {
          type: Types.String
        },
        prefix: {
          type: Types.String
        },
        size: {
          type: Types.String
        }
      }
    })
  }


  static store(typeName, typeSchema) {
    let metaFields = [];
    let meta = {
      ...typeSchema
    };

    // flatten all fields
    if (typeSchema.fields && typeof typeSchema.fields === 'object') {
      for(let key of Object.keys(typeSchema.fields)) {
        let field = typeSchema.fields[key];
        let fieldType = field.type;

        let metaField = {
          ...field,
          // overrides
          name: key,
          type: field.type.toString(),
          resolved: field.resolve && typeof field.resolve === 'function' ? true : false
        };

        if (Types.isOfType(fieldType, 'GraphQLEnumType')) {
          metaField.values = keys(this.metaStore[fieldType]);
          metaField.keys = values(this.metaStore[fieldType]).map(valueObj => valueObj.value);
          metaField.type = 'Enum';
        }

        if (fieldType && Types.isOfType(fieldType, 'GraphQLList') &&  Types.isOfType(fieldType.ofType, 'GraphQLEnumType')) {
          metaField.values = keys(this.metaStore[fieldType.ofType]);
          metaField.keys = values(this.metaStore[fieldType.ofType]).map(valueObj => valueObj.value);
          metaField.type = '[Enum]';
        }

        metaFields.push(metaField);
      }

      meta.fields = metaFields
    }

		this.metaStore[typeName] = meta;
		return true;
	}

	static get(typeName) {
    typeName = typeName.toString();
		if (this.metaStore[typeName]) {
			return this.metaStore[typeName];
		} else {
			return false;
		}
	}

  static resolveDynamicType(typeName) {
    // let type = Types.get(typeName);
    // let resolvedType = [];
    // let introspectedFields = type.getFields();
    //
    // for(let key of Object.keys(introspectedFields)) {
    //
    // }
    // return type.getFields();
  }

  static resolveRelationalFields(typeMeta, relationKeys) {
    let relationFields = filter(typeMeta.fields, field =>
      (relationKeys.includes(field.name) ? true : false));

    let resolvedRelationalFieldsMap = {};

    relationFields.map(relationField => {
      let relationName = relationField.name;
      let resolvedRelations = [];

      // accessing internal type API getFields()
      let internalRelationTypeFields = Types.get(relationField.type).getFields();

      for (let key of Object.keys(internalRelationTypeFields)) {
        let field =  internalRelationTypeFields[key];
        let fieldType = internalRelationTypeFields[key].type;
        let baseFieldTypeName = Types.isOfType(fieldType, 'GraphQLList') ? fieldType.ofType.name: fieldType.name

        let nestedRelations = [];

        if (relationName === '_child' || relationName === '_children') {
          nestedRelations = ['_child', '_children']
        }

        if (relationName === '_parent') {
          nestedRelations = ['_parent']
        }

        resolvedRelations.push({
          name: key,
          type: fieldType.toString(),
          meta: Meta.resolveTypeMeta(Meta.get(baseFieldTypeName), nestedRelations)
        });
      }

      resolvedRelationalFieldsMap[relationField.name] = resolvedRelations;
    });

    return resolvedRelationalFieldsMap;
  }

  static resolveTypeMeta(typeMeta, relationKeys = false) {
    let filteredKeys = ['_child', '_children', '_parent'];

    // handling relations
    relationKeys = relationKeys ? relationKeys : filteredKeys;
    let relationalFieldsMap = Meta.resolveRelationalFields(typeMeta, relationKeys);

    return {
      name: typeMeta.name,
      fields: filter(typeMeta.fields, field =>
        (!filteredKeys.includes(field.name) ? true : false)),
      ...relationalFieldsMap
    };
  }

  static typeResolver() {
    return new Resolver('meta.type', (_, args, ctx) => {
      let typeName = args.name;
      let typeMeta = Meta.get(typeName);

      if (!typeMeta) {
        throw new TypeNotFoundError({
          data: {
            name: typeName
          }
        });
      }

      return Meta.resolveTypeMeta(typeMeta);
    });
  }

  static typesResolver() {
    return new Resolver('meta.types', (_, args, ctx) => {
      let typesName = args.name;
      let typesMeta = [];

      typesName.map(typeName => {
        let typeMeta = Meta.get(typeName);

        if (!typeMeta) {
          throw new TypeNotFoundError({
            data: {
              name: typeName
            }
          });
        }

        typesMeta.push(Meta.resolveTypeMeta(typeMeta));
      })

      return typesMeta;
    });
  }

  static generateRootMetaType() {
    return Types.generateType({
			name: 'RootMeta',
			fields: {
				type: {
					type: Meta.Type,
					args: {
						name: {
							type: Types.String
						}
					},
					resolve: Meta.typeResolver()
				},
        types: {
					type: Types.List(Meta.Type),
					args: {
						name: {
							type: Types.List(Types.String)
						}
					},
					resolve: Meta.typesResolver()
				}
			}
		});
  }
}

Meta.metaStore = {};
export default Meta;
