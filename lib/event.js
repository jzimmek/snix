(function(){
  
  Snix.Event = {};

  Snix.Event.events = function(){
    var obj = arguments[0];
    
    for(var i=1; i < arguments.length; i++){
      var name = arguments[i]+"Listener";
      (function(name){
        var property = "__"+name;
        obj[name] = function(){
          this[property] = this[property] || [];
          return this[property];
        };
      }).apply(this, [name]);
    }

    obj.on = function(event, fun, bind){
      Snix.Event.on(this, event, fun, bind);
      return this;
    };

    obj.one = function(event, fun, bind){
      Snix.Event.one(this, event, fun, bind);
      return this;
    };

    obj.off = function(event, fun){
      Snix.Event.off(this, event, fun);
      return this;
    };
  };

  Snix.Event.trigger = function(obj, event, args){
    args = args || [];
    _.each(obj[event+"Listener"](), function(e){
      var fun = e[0], bind = e[1];
      fun.apply(bind||this, args);
    });
  };

  Snix.Event.on = function(obj, event, fun, bind){
    obj[event+"Listener"]().push([fun,bind||obj]);
    return obj;
  };

  Snix.Event.off = function(obj, event, fun){
    obj["__"+event+"Listener"] = _.reject(obj[event+"Listener"](), function(e){ return e[0] === fun; });
    return obj;
  };

  Snix.Event.one = function(obj, event, fun, bind){
    var f = function(){
      Snix.Event.off(obj, event, f);
      fun.apply(bind||obj, arguments);
    };
    obj[event+"Listener"]().push([f,bind||obj]);
    return obj;
  };
  
})();