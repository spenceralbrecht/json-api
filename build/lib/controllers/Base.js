// Generated by LiveScript 1.2.0
(function(){
  var Q, mongoose, bodyParser, templating, Document, Collection, ErrorResource, utils, BaseController;
  Q = require('q');
  mongoose = require('mongoose');
  bodyParser = require('body-parser');
  templating = require('url-template');
  Document = require('../types/Document');
  Collection = require('../types/Collection');
  ErrorResource = require('../types/ErrorResource');
  utils = require('../util/utils');
  BaseController = (function(){
    BaseController.displayName = 'BaseController';
    var prototype = BaseController.prototype, constructor = BaseController;
    function BaseController(registry, idHashSecret){
      this.registry = registry;
      this.idHashSecret = idHashSecret;
      this.jsonBodyParser = bodyParser.json({
        type: ['json', 'application/vnd.api+json']
      });
    }
    prototype.GET = function(req, res, next){
      var type, adapter, sorts, fields, includes, filters, idOrIds, this$ = this;
      type = req.params.type;
      adapter = this.registry.adapter(type);
      if (req.query.sort != null) {
        sorts = req.query.sort.split(',').map(decodeURIComponent);
      }
      if (req.query.fields != null) {
        fields = req.query.fields.split(',').map(decodeURIComponent);
      }
      if (req.query.include != null) {
        includes = req.query.include.split(',').map(decodeURIComponent);
      } else {
        includes = this.registry.defaultIncludes(type);
      }
      filters = function(){
        var params, attr, ref$, val;
        params = import$({}, req.query);
        delete params['fields'], delete params['include'], delete params['sort'];
        for (attr in ref$ = filters) {
          val = ref$[attr];
          if (/^(fields|sort)\[.+?\]$/.exec(attr)) {
            delete params[attr];
          }
        }
        return params;
      }();
      idOrIds = this._readIds(req);
      return adapter.find(type, idOrIds, filters, fields, sorts, includes).then(function(resources){
        return this$.sendResources(req, res, resources[0], resources[1]);
      })['catch'](function(err){
        var er;
        er = ErrorResource.fromError(err);
        return this$.sendResources(req, res, er);
      }).done();
    };
    prototype.POST = function(req, res, next){
      var this$ = this;
      if (req.is('application/vnd.api+json') === false) {
        return next();
      }
      return constructor.getBodyResources(req, this.jsonBodyParser).then(function(resources){
        var type, adapter;
        resources = this$._transformRecursive(resources, req, res, 'beforeSave');
        type = resources.type;
        adapter = this$.registry.adapter(type);
        return adapter.create(resources).then(function(created){
          var template, ref$;
          if (created.type !== "errors") {
            res.status(201);
            template = this$.registry.urlTemplate(type);
            res.set('Location', templating.parse(template).expand((ref$ = {}, ref$[type + ".id"] = utils.mapResources(created, function(it){
              return it.id;
            }), ref$)));
          }
          return this$.sendResources(req, res, created);
        });
      })['catch'](function(err){
        if (!(err instanceof ErrorResource || err instanceof Collection)) {
          err = ErrorResource.fromError(err);
        }
        return this$.sendResources(req, res, err);
      });
    };
    prototype.PUT = function(req, res, next){
      if (req.is('application/vnd.api+json') === false) {
        return next();
      }
    };
    prototype.DELETE = function(req, res, next){
      var type, adapter, idOrIds, this$ = this;
      type = req.params.type;
      adapter = this.registry.adapter(type);
      idOrIds = this._readIds(req);
      return adapter['delete'](type, idOrIds).then(function(resources){
        res.status(204);
        return res.send();
      })['catch'](function(err){
        var er;
        er = ErrorResource.fromError(err);
        return this$.sendResources(req, res, er);
      });
    };
    prototype.sendResources = function(req, res, primaryResources, extraResources, meta){
      var status, this$ = this;
      if (primaryResources.type === "errors") {
        if (primaryResources instanceof Collection) {
          status = constructor.pickStatus(primaryResources.resources.map(function(it){
            return Number(it.attrs.status);
          }));
        } else {
          status = primaryResources.attrs.status;
        }
      } else {
        status = res.statusCode || 200;
      }
      primaryResources = Q(bind$(this, '_transformRecursive')(primaryResources, req, res, 'afterQuery'));
      extraResources = Q(function(){
        var type, ref$, resources;
        for (type in ref$ = extraResources) {
          resources = ref$[type];
          resources = resources.map(fn$);
        }
        return extraResources;
        function fn$(it){
          return bind$(this$, '_transformRecursive')(it, req, res, 'afterQuery');
        }
      }());
      return Q.all([primaryResources, extraResources]).spread(function(primary, extra){
        res.set('Content-Type', 'application/vnd.api+json');
        return res.status(Number(status)).json(new Document(primary, extra, meta, this$.registry.urlTemplates()).get());
      }).done();
    };
    /**
     * Takes a Resource or Collection being returned and applies the
     * appropriate afterQuery method to it and (recursively)
     * to all of its linked resources.
     */
    prototype._transformRecursive = function(resourceOrCollection, req, res, transformMode){
      var this$ = this;
      if (resourceOrCollection instanceof Collection) {
        resourceOrCollection.resources = resourceOrCollection.resources.map(function(it){
          return this$._transform(it, req, res, transformMode);
        });
        return resourceOrCollection;
      } else {
        return this._transform(resourceOrCollection, req, res, transformMode);
      }
    };
    /** 
     * A helper function for {@_transformRecursive}.
     * @api private
     */
    prototype._transform = function(resource, req, res, transformMode){
      var transformFn, path, ref$, linked;
      transformFn = this.registry[transformMode](resource.type);
      if (transformFn) {
        resource = transformFn(resource, req, res);
      }
      for (path in ref$ = resource.links) {
        linked = ref$[path];
        resource.links[path] = this._transformRecursive(resource.links[path], req, res, transformMode);
      }
      return resource;
    };
    prototype._readIds = function(req){
      var idOrIds;
      if (req.params.id != null) {
        idOrIds = req.params.id.split(",").map(decodeURIComponent);
        if (idOrIds.length === 1) {
          return idOrIds[0];
        } else {
          return idOrIds;
        }
      } else {}
    };
    BaseController.pickStatus = function(errStatuses){
      return errStatuses[0];
    };
    BaseController.getBodyResources = function(req, parser){
      var _makeResources;
      _makeResources = function(parsedBody){
        var type, resources;
        type = req.params.type;
        resources = parsedBody && (parsedBody[type] || parsedBody.data);
        if (!resources || (resources instanceof Array && !resources.length)) {
          throw new ErrorResource(null, {
            title: "Request body must contain a resource or an array of resources.",
            detail: "This resource or array of resources should be stored at the top-level document's `" + type + "` or `data` key.",
            status: 400
          });
        }
        return Document.primaryResourcesfromJSON(parsedBody);
      };
      if (typeof req.body !== "object") {
        return Q.nfapply(parser, [req, {}]).then(function(){
          return _makeResources(req.body);
        }, function(err){
          switch (err.message) {
          case /encoding unsupported/i:
            throw new ErrorResource(null, {
              title: err.message,
              status: err.status
            });
          case /empty body/i:
            req.body = null;
            return _makeResources(req.body);
          case /invalid json/i:
            throw new ErrorResource(null, {
              title: "Request contains invalid JSON.",
              status: 400
            });
          default:
            if (err instanceof SyntaxError) {
              err.title = "Request contains invalid JSON.";
            }
            throw ErrorResource.fromError(err);
          }
        });
      } else {
        return Q(_makeResources(req.body));
      }
    };
    return BaseController;
  }());
  /*
    fulfillUpdate: function(req, res, next, customUpdateFunction, customModelResolver) {
      var self = this
        , updateFunction;    
      if(typeof customUpdateFunction === "function") {
        updateFunction = customUpdateFunction;
      } 
      else {
        updateFunction = function(doc) {
          for(var key in req.body) {
            doc[key] = req.body[key];
          }
          return doc;
        };
      }
      //200 status code + resource, rather than a 204,
      //is ok (actually, required) because we're updating
      //the modified date field on each PUT.
      this.mongooseDocFromIdsPromise(req, customModelResolver)
        .then(
          updateFunction
        ).then(function(doc) {
          return Q.nfcall(doc.save);
        })
        .spread(
          this.mongooseDocToJsonApiResource
        ).then(
          res.json.bind(res)
        ).catch(function(err) { 
          self.sendJsonApiError(err, res);
        });
    },
  };*/
  module.exports = BaseController;
  function import$(obj, src){
    var own = {}.hasOwnProperty;
    for (var key in src) if (own.call(src, key)) obj[key] = src[key];
    return obj;
  }
  function bind$(obj, key, target){
    return function(){ return (target || obj)[key].apply(obj, arguments) };
  }
}).call(this);
