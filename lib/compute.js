(function(){  
  var baseCompute = function(v, fun, bind, context){
    var initialized = false;

    v.get = function(){
      if(!initialized){
        initialized = true;
        this.refresh();
      }
      return this.value;
    };

    var origSet = v.set;

    v.set = function(){
      throw "compute not writable";
    };

    v.refresh = function(){
      fun.apply(bind, [this.createSetter()]);
    };

    v.subscribe = function(){
      for(var i=0; i < arguments.length; i++){
        arguments[i].on("change", function(){
          this.refresh();
        }, this);
      }
      return this;
    };

    v.subscribeObject = function(obj){
      for(var i=0; i < arguments.length; i++){
        var obj = arguments[i];
        _.each(_.keys(obj), function(key){
          if(obj[key].__snix__)
            this.subscribe(obj[key]);
        }, this);
      };
      return this;
    };

    v.createSetter = function(){
      return function(newValue){
        origSet.apply(v, [newValue]);
      };
    };

    return v;
  };

  Snix.compute = function(fun, bind, context){
    return baseCompute(Snix.val(), fun, bind, context);
  };

  Snix.computeArray = function(fun, bind, context){
    return baseCompute(Snix.array(), fun, bind, context);
  };
})();