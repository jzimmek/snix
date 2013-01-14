Snix.record = function(RecordFun){
  var v = Snix.val();

  v.newRecord = function(){
    v(new RecordFun);
  };

  v.find = function(id){
    var r = RecordFun.find(id);

    r.subcribe(function(newValue){
      v(newValue);
    });
  };

  return v;
}

Snix.Record = function(baseUrl, attributes){

  var hasManyEntries = {};

  var RecordFun = function(data, parent){
    this.id = s.val();

    this.canCreate = s.compute(function(){
      return this.id() == null;
    }, this);

    this.canSave = s.compute(function(){
      return this.id() != null;
    }, this);

    this.canDelete = s.compute(function(){
      return this.id() != null;
    }, this);

    this.url = s.compute(function(){
      return (parent != null ? parent.url() : "") + baseUrl + "/" + this.id();
    }, this);

    this.urlCreate = s.compute(function(){
      return (parent != null ? parent.url() : "") + baseUrl;
    }, this);

    var listener = {
      create: [],
      save: [],
      delete: []
    };  

    this.on = function(op, fun, context){
      listener[op].push(_.bind(fun, context||this));
    };

    var attributeNames = _.keys(attributes);

    this.delete = function(){
      var ajax = $.ajax({
        type: "POST", 
        url: this.url(),
        data: {_method: "DELETE"}
      }).success(function(){ _.invoke(listener["delete"], "call", null); })
        .error(function(err){ alert(err); });

      // s.delete(this.url())
      //   .success(function(){ _.invoke(listener["delete"], "call", null); })
      //   .error(function(err){ alert(err); });

      return this;
    };

    this.save = function(){
      var data = JSON.stringify(_.pick(this, attributeNames));
      var ajax = $.ajax({
        type: "POST", 
        url: this.url(), 
        data: {data: data, _method: "PUT"},
        dataType: "json"
      }).success(function(){ _.invoke(listener["save"], "call", null); })
        .error(function(err){ alert(err); });


      // s.put(this.url(), _.pick(this, attributeNames))
      //   .success(function(){ _.invoke(listener["save"], "call", null); })
      //   .error(function(err){ alert(err); });

      return this;
    };

    this.create = function(){
      var self = this;

      var data = JSON.stringify(_.pick(this, attributeNames));
      var ajax = $.ajax({
        type: "POST", 
        url: url, 
        data: data, 
        dataType: "json"
      }).success(function(res){ 
          self.id(res["id"]); 
          _.invoke(listener["create"], "call", null);
        }, this)
        .error(function(err){ alert(err); });


      // s.post(this.urlCreate(), _.pick(this, attributeNames))
      //   .success(function(res){ 
      //     this.id(res["id"]); 
      //     _.invoke(listener["create"], "call", null);
      //   }, this)
      //   .error(function(err){ alert(err); });

      return this;
    };


    data = data || {};

    if(data.id)
      this.id(data.id);

    for(var key in attributes){
      var arr = attributes[key];
      var val = data[key] === undefined ? arr[1] : data[key];

      if(val != null && arr[2])
        val = arr[2].apply(val, [val]);

      this[key] = arr[0](val);
    }

    for(var key in hasManyEntries){
      var ManyRecordFun = hasManyEntries[key];

      this[key] = s.array();

      var self = this;
      this[key].load = function(){
        s.get(self.url() + ManyRecordFun.baseUrl).success(function(data){
          self[key](_.map(data, function(e){ return new ManyRecordFun(e, self); }));
        }, this).error(function(err){
          alert("err: " + err);
        });
        return this;
      };

      this[key].reload = function(){
        this([]);
        return this.load();
      };
    }
  };

  RecordFun.all = function(lazy){
    var res = s.array();

    res.load = function(){
      var self = this;
      s.get(baseUrl).success(function(data){
        self(_.map(data, function(e){ return new RecordFun(e); }));
      }).error(function(err){
        alert("err: " + err);
      });
      return this;
    };

    res.reload = function(){
      this([]);
      return this.load();
    };

    if(!lazy)
      res.load();

    return res;
  };

  RecordFun.find = function(id){
    var res = s.val();

    res.load = function(){
      var self = this;
      s.get(baseUrl).success(function(data){
        self(new RecordFun(data));
      }).error(function(err){
        alert("err: " + err);
      });
      return this;
    }

    res.reload = function(){
      this(null);
      return this.load();
    };

    res.load();

    return res;
  };

  RecordFun.hasMany = function(name, RecordFun){
    hasManyEntries[name] = RecordFun;
  };

  // RecordFun.hasOne = function(name, RecordFun){
  //   hasManyEntries[name] = RecordFun;
  // };

  RecordFun.baseUrl = baseUrl;

  return RecordFun;
};