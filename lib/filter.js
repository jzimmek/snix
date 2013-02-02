(function(){
  var Field = function(fun, raw){
    this.fun = fun;
    this.raw = raw;
  };

  var Fields = function(fields){
    this.fields = fields;
  };
  Fields.prototype.isLike = function(name){
    this.fields[name] = new Field(function(val, input){
      return input.toString().toLowerCase().indexOf(val.toLowerCase()) >= 0;
    }, false);
  };
  Fields.prototype.isIn = function(name){
    // val is expected to be an array
    this.fields[name] = new Field(function(val, input){
      return _.include(val, input);
    }, false);
  };
  Fields.prototype.is = function(name, fun){
    this.fields[name] = new Field(function(val, input){
      return fun(val, input) == true;
    }, true);
  };

  Snix.Filter = function(fun){
    this.fields = {};
    fun(new Fields(this.fields));

    for(var key in this.fields){
      (function(key){
        this[key] = Snix.val();
      }).apply(this, [key]);
    }
  };
  Snix.Filter.prototype.reset = function(){
    for(var key in this.fields){
      this[key](null);
    }
  };
  Snix.Filter.prototype.filter = function(arr){
    return _.select(Snix.unwrap(arr), function(e){
      var valid = true;

      for(var key in this.fields){
        var val = this[key]();

        if(val != null && (val.length == null || val.length > 0)){
          var field = this.fields[key];
          valid = valid && this.fields[key].fun(val, field.raw ? e : Snix.unwrap(e[key]));
        }
      }

      return valid;
    }, this);
  };
})();
