(function(){
  Snix.Filter = function(fields){
    this.fields = fields;
    for(var key in this.fields){
      var type = this.fields[key];

      if(type == "in")                      this[key] = Snix.array();
      else if(type == "like")               this[key] = Snix.val("");
      else if(typeof(type) == "function")   this[key] = Snix.array([]);
      else                                  throw "unsupported "+type;
    }
  };
  Snix.Filter.prototype.reset = function(){
    for(var key in this.fields){
      var type = this.fields[key];

      if(type == "in")                      this[key]([]);
      else if(type == "like")               this[key]("");
      else if(typeof(type) == "function")   this[key]([]);
    }
  };
  Snix.Filter.prototype.filter = function(arr){
    return _.select(Snix.unwrap(arr), function(e){
      var valid = true;

      for(var key in this.fields){
        var type = this.fields[key];

        if(type == "in" && this[key]().length > 0){
          var value = Snix.unwrap(e[key]);
          valid = valid && _.include(this[key](), value);
        }else if(type == "like" && this[key]().length > 0){
          var value = Snix.unwrap(e[key]);
          valid = valid && value && value.toString().toLowerCase().indexOf(this[key]().toLowerCase()) >= 0;
        }else if(typeof(type) == "function" && this[key]().length > 0){
          valid = valid && type(this[key](), Snix.unwrap(e));
        }
      }

      return valid;

    }, this);
  };  
})();
