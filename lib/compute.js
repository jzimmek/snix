(function(){  

  var subscribe = function(){
    for(var i=0; i < arguments.length; i++){
      arguments[i].on("change", function(){
        this.refresh();
      }, this);
    }
    return this;
  };

  var subscribeObject = function(obj){
    for(var i=0; i < arguments.length; i++){
      var obj = arguments[i];
      _.each(_.keys(obj), function(key){
        if(obj[key].__snix__)
          this.subscribe(obj[key]);
      }, this);
    };
    return this;
  };

  var createSetter = function(){
    var self = this;
    return function(newValue){
      self.origSet.apply(self, [newValue]);
    };
  };

  var refresh = function(){
    this.args.fun.apply(this.args.bind, [this.createSetter()]);
  };

  var get = function(){
    if(!this.initialized){
      this.initialized = true;
      this.refresh();
    }
    return this.value;
  };

  var proto = {
    subscribe: subscribe,
    subscribeObject: subscribeObject,
    createSetter: createSetter,
    refresh: refresh,
    get: get
  };

  var baseCompute = function(v, fun, bind, context){
    v.initialized = false;
    v.args = {fun: fun, bind: bind, context: context};

    v.origSet = v.set;
    delete v.set;

    return _.extend(v, proto);
  };

  Snix.compute = function(fun, bind, context){
    return baseCompute(Snix.val(), fun, bind, context);
  };

  Snix.computeArray = function(fun, bind, context){
    return baseCompute(Snix.array(), fun, bind, context);
  };
})();
