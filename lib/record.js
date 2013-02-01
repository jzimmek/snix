(function(){
  Snix.Record = function(baseUrl, attributes){

    var hasManyAndOne = {};

    var r = function(context, data, parent){
      if(context == null)
        throw "missing context";

      data = data || {};

      this.id = Snix.val(data.id);
      this.validator = Snix.validator();

      this.parent = parent;
      this.context = context;
      this.attributeNames = _.keys(attributes);

      for(var key in attributes){
        (function(key){
  
          var arr = attributes[key];
          var val = data[key] === undefined ? (_.isFunction(arr[1]) ? arr[1]() : arr[1]) : data[key];

          if(val != null && arr[2] != null)
            val = arr[2].apply(val, [val]);

          this[key] = arr[0](val);

          if(arr[3] != null)
            this[key].toJSON = function(){
              return this() != null ? arr[3](this()) : null;
            };
        
        }).apply(this, [key]);
      }

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

    r.prototype.toJSON = function(){
      var attributeNames = _.keys(attributes);
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

    r.prototype.saveValidationRules = {};  
    r.prototype.save = function(cb){
      if(!this.canSave())
        throw "illegal state";

      this.validator.validate(this.saveValidationRules, this);

      if(!this.validator.isEmpty())
        return;

      var data = JSON.stringify(_.pick(this, this.attributeNames));

      Snix.Rest.save(this.url(), data, this).success(function(data){
        if(data && data.lock_version && this.lock_version)
          this.lock_version(data.lock_version)

        if(cb)
          cb(this);

        Snix.Event.trigger(this, "save", [this]);
        Snix.Event.trigger(r, "save", [this]);

        Snix.refresh(this.context);
      });

      return this;
    };

    r.prototype.duplicate = function(cb){
      if(!this.canDuplicate())
        throw "illegal state";

      var data = JSON.stringify(_.pick(this, this.attributeNames));

      Snix.Rest.create(this.url()+"/duplicate", data, this).success(function(data){ 
        if(!data || !data.id)
          throw "received no id for: "+url;

        if(cb)
          cb(this, data.id);

        Snix.Event.trigger(this, "duplicate", [this, data.id]);
        Snix.Event.trigger(r, "duplicate", [this, data.id]);

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

      var data = JSON.stringify(_.pick(this, this.attributeNames));
      var url = this.createUrl();

      Snix.Rest.create(url, data, this).success(function(data){ 
        if(!data || !data.id)
          throw "received no id for: "+url;

        this.id(data.id);

        if(cb)
          cb(this, data.id);

        Snix.Event.trigger(this, "create", [this, data.id]);
        Snix.Event.trigger(r, "create", [this, data.id]);


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