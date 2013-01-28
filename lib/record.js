(function(){
  Snix.Record = function(baseUrl, attributes){

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
        var arr = attributes[key];
        var val = data[key] === undefined ? (_.isFunction(arr[1]) ? arr[1]() : arr[1]) : data[key];

        if(val != null && arr[2])
          val = arr[2].apply(val, [val]);

        this[key] = arr[0](val);
      }
    };

    r.errorFun = function(err){
      alert("error");
      if(console && console.error)
        console.error(err);
    };

    Snix.Event.events(r, "load", "save", "create", "duplicate", "destroy");

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
      var ajax = $.ajax({
        type: "POST", 
        url: this.url(), 
        data: {data: data, _method: "PUT"},
        dataType: "json",
        context: this
      }).success(function(data){

        if(data && data.lock_version && this.lock_version)
          this.lock_version(data.lock_version)

        Snix.Event.trigger(r, "save", [this]);

        if(cb)
          cb(this);

        Snix.refresh(this.context);
      }).error(r.errorFun);

      return this;
    };

    r.prototype.duplicate = function(cb){
      if(!this.canDuplicate())
        throw "illegal state";

      var data = JSON.stringify(_.pick(this, this.attributeNames));

      var ajax = $.ajax({
        type: "POST", 
        url: this.url()+"/duplicate", 
        data: data,
        dataType: "json",
        context: this
      }).success(function(data){ 
        if(!data || !data.id)
          throw "received no id for: "+url;

        Snix.Event.trigger(r, "duplicate", [this, data.id]);

        if(cb)
          cb(this, data.id);

        Snix.refresh(this.context);
      }).error(r.errorFun);

      return this;
    };

    r.prototype.destroy = function(cb){
      if(!this.canDestroy())
        throw "illegal state";

      var res = confirm("Delete this ?");

      if(!res)
        return this;

      var ajax = $.ajax({
        type: "POST", 
        url: this.url(), 
        data: {_method: "DELETE"},
        dataType: "json",
        context: this
      }).success(function(){ 
        Snix.Event.trigger(r, "destroy", [this]);

        if(cb)
          cb(this);

        Snix.refresh(this.context);
      }).error(r.errorFun);

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

      var ajax = $.ajax({
        type: "POST", 
        url: url, 
        data: data,
        dataType: "json",
        context: this
      }).success(function(data){ 
        if(!data || !data.id)
          throw "received no id for: "+url;

        this.id(data.id);

        Snix.Event.trigger(r, "create", [this, data.id]);

        if(cb)
          cb(this, data.id);

        Snix.refresh(this.context);
      }).error(r.errorFun);

      return this;
    };

    r.all = function(context){
      var res = Snix.array();

      res.load = function(cb){
        $.getJSON(baseUrl).success(function(data){
          if(!data)
            throw "received no result array for: "+url;

          res(_.map(data, function(e){ return new r(context, e, null); }));

          if(cb)
            cb(res());
          
          Snix.refresh(context);
        }).error(r.errorFun);
        return this;
      };

      return res;
    };

    r.find = function(id, context){
      var res = Snix.val();

      res.load = function(cb){
        var url = baseUrl+"/"+id;
        $.getJSON(url).success(function(data){
          if(!data)
            throw "received no result object for: "+url;

          res(new r(context, data, null));

          if(cb)
            cb(res());

          Snix.refresh(context);
        }).error(r.errorFun);
        return this;
      };

      return res;
    };

    return r;
  };
})();