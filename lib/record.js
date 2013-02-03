(function(){

  var Field = function(fun){
    this.fun = fun;
    this._dataIn = (function(v){ return v; });
    this._dataOut = (function(v){ return v; });
    this._equals = (function(v1,v2){ return v1 == v2; });
  };

  Field.prototype.equals = function(){
    if(arguments.length == 0) return this._equals;
    else{
      this._equals = arguments[0];
      return this;
    }    
  };

  Field.prototype.initial = function(){
    if(arguments.length == 0) return this._initial;
    else{
      var arg0 = arguments[0];
      this._initial = (typeof(arg0) == "function" ? arg0 : (function(){ return arg0; }));
      return this;
    }
  };
  Field.prototype.dataIn = function(){
    if(arguments.length == 0) return this._dataIn;
    else{
      this._dataIn = arguments[0];
      return this;
    }
  };
  Field.prototype.dataOut = function(){
    if(arguments.length == 0) return this._dataOut;
    else{
      this._dataOut = arguments[0];
      return this;
    }
  };

  var Fields = function(attributes){
    this.attributes = attributes;
  };
  Fields.prototype.val = function(name){
    return (this.attributes[name] = new Field(Snix.val).initial(""));
  };
  Fields.prototype.moment = function(name){
    return (this.attributes[name] = new Field(Snix.moment)
                                          .initial(function(){ return moment(); }))
                                          .dataIn(function(v){ return moment(v); })
                                          .equals(function(v1,v2){ return JSON.stringify(v1) == JSON.stringify(v2); });
  };
  Fields.prototype.int = function(name){
    return (this.attributes[name] = new Field(Snix.int).initial(0));
  };
  Fields.prototype.float = function(name){
    return (this.attributes[name] = new Field(Snix.float).initial(0.0));
  };
  Fields.prototype.boolean = function(name){
    return (this.attributes[name] = new Field(Snix.boolean).initial(true));
  };
  Fields.prototype.enu = function(name, enuFun){
    var field = new Field(function(value){
      return Snix.val(enuFun(value));
    }).initial(null);

    return (this.attributes[name] = field);
  };

  Snix.Record = function(baseUrl, fun){

    var attributes = {};

    fun(new Fields(attributes));

    var attributeNames = _.keys(attributes);

    var hasManyAndOne = {};

    var r = function(context, data, parent){
      if(context == null)
        throw "missing context";

      data = data || {};

      this.id = Snix.val(data.id);
      this.validator = new Snix.Validator;

      this.parent = parent;
      this.context = context;

      for(var key in attributes){
        (function(key){
          var field = attributes[key];
          this[key] = field.fun(data[key] === undefined ? field.initial()() : field.dataIn()(data[key]));  
        }).apply(this, [key]);
      }

      this.refreshDirtyTracking();

      var self = this;

      for(var attributeName in hasManyAndOne){
        (function(attributeName){

          var recordType = hasManyAndOne[attributeName][0], recordOpts = hasManyAndOne[attributeName][1], computeFun = hasManyAndOne[attributeName][2];
          this[attributeName] = computeFun(function(set){

            var refreshAttribute = function(){
              self[attributeName].refresh();
            };

            Snix.Rest.list(this.url() + "/" + attributeName).success(function(dataArrOrObject){

              if(computeFun == Snix.computeArray){
                var records = _.map(dataArrOrObject, function(data){ return new recordType(context, data, self).one("destroy", refreshAttribute); });
                set(records);
                _.each(records, function(record){
                  Snix.Event.trigger(recordType, "load", [record]);
                });
              }else{
                var record = new recordType(context, dataArrOrObject, self).one("destroy", refreshAttribute);
                set(record);
                Snix.Event.trigger(recordType, "load", [record]);
              }

              Snix.refresh(context);
            });

          }, this);

        }).apply(this, [attributeName]);
      }

      if(this.init)
        this.init();
    };

    Snix.Event.events(r, "load", "save", "create", "duplicate", "destroy");
    Snix.Event.events(r.prototype, "save", "create", "duplicate", "destroy");

    r.hasMany = function(attributeName, recordType, opts){
      opts = opts || {};
      hasManyAndOne[attributeName] = [recordType, opts, Snix.computeArray];
    };

    r.hasOne = function(attributeName, recordType, opts){
      opts = opts || {};
      hasManyAndOne[attributeName] = [recordType, opts, Snix.compute];
    };

    r.prototype.revert = function(){
      _.each(this.attributesFrozen, function(v, k){
        this[k](v);
      }, this);
      this.refreshDirtyTracking();
    };

    r.prototype.refreshDirtyTracking = function(){
      this.attributesFrozen = this.attributesAsObj();
    };

    r.prototype.isDirty = function(){
      var probeAttributeNames = (arguments.length == 0 ? attributeNames : arguments);

      return !_.all(probeAttributeNames, function(attributeName){
        return attributes[attributeName].equals()(this[attributeName](), this.attributesFrozen[attributeName]);
      }, this);
    };

    r.prototype.attributesAsObj = function(){
      return _.inject(attributeNames, function(memo, k){
        memo[k] = this[k]();
        return memo;
      }, {}, this);
    };

    r.prototype.toJSON = function(){
      return _.pick(this, attributeNames);
    };

    r.prototype.canCreate = function(){
      return this.id() == null;
    };

    r.prototype.canSave = function(){
      return this.id() != null;
    };

    r.prototype.canDestroy = function(){
      return this.id() != null;
    };

    r.prototype.canDuplicate = function(){
      return this.id() != null;
    };

    r.prototype.url = function(){
      return (this.parent != null ? this.parent.url() : "") + baseUrl + "/" + this.id();
    };

    r.prototype.createUrl = function(){
      return (this.parent != null ? this.parent.url() : "") + baseUrl;
    };

    r.prototype.dataAsJSON = function(){
      var obj = _.pick(this, attributeNames);

      _.each(obj, function(v, k){
        var field = attributes[k];
        var dataOut = field.dataOut()(v);

        // json2 does not honor toJSON on function
        dataOut = dataOut.toJSON ? dataOut.toJSON() : dataOut();

        obj[k] = dataOut;
      });

      var json = JSON.stringify(obj);
      return json;
    };

    r.prototype.saveValidationRules = {};  
    r.prototype.save = function(cb){
      if(!this.canSave())
        throw "illegal state";

      this.validator.validate(this.saveValidationRules, this);

      if(!this.validator.isEmpty())
        return;

      var data = this.dataAsJSON();

      Snix.Rest.save(this.url(), data, this).success(function(data){
        if(data && data.lock_version && this.lock_version)
          this.lock_version(data.lock_version)

        if(cb)
          cb(this);

        Snix.Event.trigger(this, "save", [this]);
        Snix.Event.trigger(r, "save", [this]);

        this.refreshDirtyTracking();

        Snix.refresh(this.context);
      });

      return this;
    };

    r.prototype.duplicate = function(cb){
      if(!this.canDuplicate())
        throw "illegal state";

      var data = this.dataAsJSON();

      Snix.Rest.create(this.url()+"/duplicate", data, this).success(function(data){ 
        if(!data || !data.id)
          throw "received no id for: "+url;

        if(cb)
          cb(this, data.id);

        Snix.Event.trigger(this, "duplicate", [this, data.id]);
        Snix.Event.trigger(r, "duplicate", [this, data.id]);

        this.refreshDirtyTracking();

        Snix.refresh(this.context);
      });

      return this;
    };

    r.prototype.destroy = function(cb){
      if(!this.canDestroy())
        throw "illegal state";

      var res = confirm("Delete this ?");

      if(!res)
        return this;

      Snix.Rest.destroy(this.url(), {}, this).success(function(){ 
        if(cb)
          cb(this);

        Snix.Event.trigger(this, "destroy", [this]);
        Snix.Event.trigger(r, "destroy", [this]);

        Snix.refresh(this.context);
      });

      return this;
    };

    r.prototype.createValidationRules = {};
    r.prototype.create = function(cb){
      if(!this.canCreate())
        throw "illegal state";

      this.validator.validate(this.createValidationRules, this);

      if(!this.validator.isEmpty())
        return;

      var data = this.dataAsJSON();
      var url = this.createUrl();

      Snix.Rest.create(url, data, this).success(function(data){ 
        if(!data || !data.id)
          throw "received no id for: "+url;

        this.id(data.id);

        if(cb)
          cb(this, data.id);

        Snix.Event.trigger(this, "create", [this, data.id]);
        Snix.Event.trigger(r, "create", [this, data.id]);

        this.refreshDirtyTracking();

        Snix.refresh(this.context);
      });

      return this;
    };

    r.all = function(context){
      var res = Snix.array();

      res.load = function(cb){
        Snix.Rest.list(baseUrl).success(function(data){
          if(!data)
            throw "received no result array for: "+url;

          var records = _.map(data, function(e){ return new r(context, e, null); });
          res(records);

          if(cb)
            cb(records);

          _.each(records, function(record){
            Snix.Event.trigger(r, "load", [record]);
          });
          
          Snix.refresh(context);
        });
        return this;
      };

      return res;
    };

    r.find = function(context){
      var res = Snix.val();

      res.load = function(id, cb){
        var url = baseUrl+"/"+id;
        Snix.Rest.list(url).success(function(data){
          if(!data)
            throw "received no result object for: "+url;

          res(new r(context, data, null));

          var record = res();

          if(cb)
            cb(record);

          Snix.Event.trigger(r, "load", [record]);

          Snix.refresh(context);
        });
        return this;
      };

      return res;
    };

    return r;
  };
})();