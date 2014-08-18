// Generated by LiveScript 1.2.0
(function(){
  var Q, mongoose, prelude, defaultInflector, Resource, Collection, ErrorResource, advice, utils, MongooseAdapter, toString$ = {}.toString;
  Q = require('q');
  mongoose = require('mongoose');
  prelude = require('prelude-ls');
  defaultInflector = require('pluralize');
  Resource = require('../types/Resource');
  Collection = require('../types/Collection');
  ErrorResource = require('../types/ErrorResource');
  advice = require('../util/advice');
  utils = require('../util/utils');
  MongooseAdapter = (function(){
    MongooseAdapter.displayName = 'MongooseAdapter';
    var prototype = MongooseAdapter.prototype, constructor = MongooseAdapter;
    function MongooseAdapter(models, inflector){
      this.models = models || mongoose.models;
      this.inflector = inflector || defaultInflector;
    }
    /**
     * Returns a Promise for an array or resources. The first item in the 
     * promised array is the primary Resource or Collection being looked up.
     * The second item is an array of "extra resources". See the comments within
     * this method for a description of those.
     */
    prototype.find = function(type, idOrIds, filters, fields, sorts, includePaths){
      var model, refPaths, queryBuilder, idQuery, mode, extraResources, extraFieldsToModelInfo, extraDocumentsPromises, duplicateQuery, i$, len$, pathParts, refModel, refType, refRefPaths, lastModelName, primaryDocumentsPromise, extraResourcesPromise, primaryResourcesPromise, this$ = this;
      model = this.models[constructor.getModelName(type)];
      refPaths = constructor.getReferencePaths(model);
      queryBuilder = new mongoose.Query(null, null, model, model.collection);
      if (idOrIds) {
        switch (typeof idOrIds) {
        case "string":
          idQuery = idOrIds;
          mode = "findOne";
          break;
        default:
          idQuery = {
            '$in': idOrIds
          };
          mode = "find";
        }
        queryBuilder[mode]({
          '_id': idQuery
        });
      } else {
        queryBuilder.find();
      }
      if (toString$.call(filters).slice(8, -1) === "Object") {
        queryBuilder.where(filters);
      }
      if (fields instanceof Array) {
        queryBuilder.select(fields.map(function(it){
          var ref$;
          if ((ref$ = it.charAt(0)) === '+' || ref$ === '-') {
            return it.substr(1);
          } else {
            return it;
          }
        }).join(' '));
      }
      if (sorts instanceof Array) {
        queryBuilder.sort(sorts.join(' '));
      }
      if (includePaths) {
        extraResources = {};
        extraFieldsToModelInfo = {};
        extraDocumentsPromises = [];
        duplicateQuery = queryBuilder.toConstructor();
        includePaths = includePaths.map(function(it){
          return it.split('.');
        });
        for (i$ = 0, len$ = includePaths.length; i$ < len$; ++i$) {
          pathParts = includePaths[i$];
          if (!in$(pathParts[0], constructor.getReferencePaths(model))) {
            continue;
          }
          if (pathParts.length === 1) {
            queryBuilder.populate(pathParts[0]);
            if (fields && !in$(pathParts[0], fields)) {
              queryBuilder.select(pathParts[0]);
              refModel = this.models[constructor.getReferencedModelName(model, pathParts[0])];
              refType = constructor.getType(refModel.modelName, this.inflector.plural);
              refRefPaths = constructor.getReferencePaths(refModel);
              if (!extraResources[refType]) {
                extraResources[refType] = [];
              }
              extraFieldsToModelInfo[pathParts[0]] = {
                model: refModel,
                refPaths: refRefPaths,
                type: refType
              };
            }
          } else {
            lastModelName = model.modelName;
            extraDocumentsPromises.push(pathParts.reduce(fn$, Q(duplicateQuery().exec())));
          }
        }
        primaryDocumentsPromise = Q(queryBuilder.exec()).then(function(docs){
          utils.forEachArrayOrVal(docs, function(doc){
            var field, ref$, modelInfo, refDocsArray;
            for (field in ref$ = extraFieldsToModelInfo) {
              modelInfo = ref$[field];
              refDocsArray = doc[field] instanceof Array
                ? doc[field]
                : [doc[field]];
              refDocsArray.forEach(fn$);
              doc[field] = undefined;
            }
            function fn$(referencedDoc){
              if (referencedDoc && !extraResources[modelInfo.type].some(function(it){
                return it.id === referencedDoc.id;
              })) {
                return extraResources[modelInfo.type].push(constructor.docToResource(referencedDoc, modelInfo.type, modelInfo.refPaths));
              }
            }
          });
          return docs;
        });
        extraResourcesPromise = Q.all(extraDocumentsPromises).then(function(docSets){
          var i$, len$, docSet, model, type, refPaths;
          for (i$ = 0, len$ = docSets.length; i$ < len$; ++i$) {
            docSet = docSets[i$];
            if (!(docSet instanceof Array)) {
              docSet = [docSet];
            }
            docSet = docSet.filter(fn$);
            if (!docSet.length) {
              continue;
            }
            model = docSet[0].constructor;
            type = constructor.getType(model.modelName, this$.inflector.plural);
            refPaths = constructor.getReferencePaths(model);
            if (!extraResources[type]) {
              extraResources[type] = [];
            }
            docSet.forEach(fn1$);
          }
          return primaryDocumentsPromise.then(function(){
            return extraResources;
          });
          function fn$(it){
            return it;
          }
          function fn1$(doc){
            if (!extraResources[type].some(function(it){
              return it.id === doc.id;
            })) {
              return extraResources[type].push(constructor.docToResource(doc, type, refPaths));
            }
          }
        });
      } else {
        primaryDocumentsPromise = Q(queryBuilder.exec());
        extraResourcesPromise = Q(undefined);
      }
      primaryResourcesPromise = primaryDocumentsPromise.then(function(it){
        return constructor.docsToResourceOrCollection(it, model, this$.inflector.plural);
      });
      return Q.all([primaryResourcesPromise, extraResourcesPromise])['catch'](function(it){
        return [constructor.errorHandler(it), undefined];
      });
      function fn$(resourcePromises, part){
        return resourcePromises.then(function(resources){
          if (resources) {
            lastModelName = constructor.getReferencedModelName(this$.models[lastModelName], part);
            return Q.npost(this$.models[lastModelName], "populate", [
              resources, {
                path: part
              }
            ]);
          }
        }).then(function(it){
          var flatten, mapped;
          if (!it || (it instanceof Array && !it.length)) {
            return it;
          }
          if (!(it instanceof Array)) {
            return it[part];
          } else {
            flatten = it[0][part] instanceof Array;
            mapped = it.map(function(it){
              return it[part];
            });
            if (flatten) {
              return mapped.reduce(function(a, b){
                return a.concat(b);
              });
            } else {
              return mapped;
            }
          }
        });
      }
    };
    prototype.create = function(resourceOrCollection){
      var model, docs, this$ = this;
      model = this.models[constructor.getModelName(resourceOrCollection.type)];
      docs = utils.mapResources(resourceOrCollection, constructor.resourceToPlainObject);
      return Q.ninvoke(model, "create", docs).then(function(it){
        return constructor.docsToResourceOrCollection(it, model, this$.inflector.plural);
      }, constructor.errorHandler);
    };
    prototype.update = function(huh){};
    prototype['delete'] = function(type, idOrIds){
      var model, idQuery, mode;
      model = this.models[constructor.getModelName(type)];
      if (idOrIds) {
        switch (typeof idOrIds) {
        case "string":
          idQuery = idOrIds;
          mode = "findOneAndRemove";
          break;
        default:
          idQuery = {
            '$in': idOrIds
          };
          mode = "remove";
        }
      }
      return Q(model[mode]({
        '_id': idQuery
      }).exec())['catch'](constructor.errorHandler);
    };
    MongooseAdapter.errorHandler = function(err){
      var errors, key, ref$, thisError, x$, generatedError;
      if (err.errors != null) {
        errors = [];
        for (key in ref$ = err.errors) {
          thisError = ref$[key];
          x$ = generatedError = {};
          x$['status'] = err.name === "ValidationError"
            ? 400
            : thisError.status || 500;
          x$['title'] = thisError.message;
          if (thisError.path != null) {
            x$['path'] = thisError.path;
          }
          errors.push(new ErrorResource(null, generatedError));
        }
        return new Collection(errors, null, "errors");
      } else {
        return new ErrorResource(null, {
          "title": "An error occurred while trying to find, create, or modify the requested resource(s)."
        });
      }
    };
    MongooseAdapter.docsToResourceOrCollection = function(docs, model, pluralize){
      var makeCollection, type, refPaths, this$ = this;
      if (!docs) {
        return new ErrorResource(null, {
          status: 404,
          title: "No matching resource found."
        });
      }
      makeCollection = docs instanceof Array;
      if (!makeCollection) {
        docs = [docs];
      }
      type = constructor.getType(model.modelName, pluralize);
      refPaths = constructor.getReferencePaths(model);
      docs = docs.map(function(it){
        return constructor.docToResource(it, type, refPaths);
      });
      if (makeCollection) {
        return new Collection(docs, null, type);
      } else {
        return docs[0];
      }
    };
    MongooseAdapter.resourceToPlainObject = function(resource){
      var res, key, ref$, value;
      res = import$({}, resource.attrs);
      if (resource.links != null) {
        for (key in ref$ = resource.links) {
          value = ref$[key];
          res[key] = value.ids || value.id;
        }
      }
      return res;
    };
    MongooseAdapter.docToResource = function(doc, type, refPaths, pluralize){
      var attrs, links, resource;
      attrs = doc.toObject();
      delete attrs['_id'], delete attrs['__v'], delete attrs['__t'];
      links = {};
      refPaths.forEach(function(path){
        var pathParts, valAtPath, jsonValAtPath, isToOneRelationship, resources, this$ = this;
        pathParts = path.split('.');
        valAtPath = pathParts.reduce(function(obj, part){
          return obj[part];
        }, doc);
        jsonValAtPath = pathParts.reduce(function(obj, part){
          return obj[part];
        }, attrs);
        utils.deleteNested(path, attrs);
        if (!valAtPath || (valAtPath instanceof Array && valAtPath.length === 0)) {
          return;
        }
        isToOneRelationship = false;
        if (!(valAtPath instanceof Array)) {
          valAtPath = [valAtPath];
          jsonValAtPath = [jsonValAtPath];
          isToOneRelationship = true;
        }
        resources = [];
        valAtPath.forEach(function(docOrId, i){
          var model, type, id;
          if (docOrId instanceof mongoose.Document) {
            model = docOrId.constructor;
            type = constructor.getType(model.modelName, pluralize);
            return resources.push(constructor.docToResource(docOrId, type, constructor.getReferencePaths(model)));
          } else {
            id = jsonValAtPath[i];
            type = constructor.getType(constructor.getReferencedModelName(doc.constructor, path), pluralize);
            return resources.push(new Resource(type, id));
          }
        });
        return links[path] = isToOneRelationship
          ? resources[0]
          : new Collection(resources);
      });
      resource = new Resource(type, doc.id, attrs, !prelude.Obj.empty(links) ? links : void 8);
      return constructor.handleSubDocs(doc, resource);
    };
    MongooseAdapter.handleSubDocs = function(doc, resource){
      return resource;
    };
    MongooseAdapter.getReferencePaths = function(model){
      var paths, this$ = this;
      paths = [];
      model.schema.eachPath(function(name, type){
        var ref$;
        if ((ref$ = (type.caster || type).options) != null && ref$.ref) {
          return paths.push(name);
        }
      });
      return paths;
    };
    MongooseAdapter.getReferencedModelName = function(model, path){
      var schemaType, ref$;
      schemaType = model.schema.path(path);
      return (ref$ = (schemaType.caster || schemaType).options) != null ? ref$.ref : void 8;
    };
    MongooseAdapter.getType = function(modelName, pluralize){
      pluralize = pluralize || defaultInflector.plural;
      return pluralize(modelName.replace(/([A-Z])/g, '-$1').slice(1).toLowerCase());
    };
    MongooseAdapter.getModelName = function(type, singularize){
      var words;
      singularize = singularize || defaultInflector.singular;
      words = type.split('-');
      words[words.length - 1] = singularize(words[words.length - 1]);
      return words.map(function(it){
        return it.charAt(0).toUpperCase() + it.slice(1);
      }).join('');
    };
    MongooseAdapter.getNestedSchemaPaths = function(model){};
    return MongooseAdapter;
  }());
  module.exports = MongooseAdapter;
  function in$(x, xs){
    var i = -1, l = xs.length >>> 0;
    while (++i < l) if (x === xs[i]) return true;
    return false;
  }
  function import$(obj, src){
    var own = {}.hasOwnProperty;
    for (var key in src) if (own.call(src, key)) obj[key] = src[key];
    return obj;
  }
}).call(this);
