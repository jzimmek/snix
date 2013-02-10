(function(){
  Snix.parse = function(str){
    return _.map(str.split(";"), function(s){
      var idx = s.indexOf(":");

      var key = s.substring(0, idx).replace(/\s/g, "");
      var val = s.substring(idx+1,s.length).replace(/^(\s)*/g, "");

      return [key, val];
    });
  };

  var accessorCache = [];

  var getOrCreateAccessor = function(keys, expr){
    var accessor = _.detect(accessorCache, function(e){
      return e.keys.join(",") == keys.join(",") && e.expr == expr;
    });

    if(accessor == null){
      accessor = {fun: new Function(keys, expr), keys: keys, expr: expr}
      accessorCache.push(accessor);
    }

    return accessor.fun;
  };

  Snix.accessedGuids = null;

  Snix.accessor = function(expr, context, vars){
    expr = expr.replace(/@/g, "this.");

    var readerKeys = _.keys(vars);
    var readerExpr = "return " + expr;

    // var reader = new Function(readerKeys, readerExpr);
    var reader = getOrCreateAccessor(readerKeys, readerExpr);

    var writerKeys = _.keys(vars).concat(["value"]);
    var writerExpr = "(" + expr + ")(value);";

    // var writer = new Function(writerKeys, writerExpr);
    var writer = getOrCreateAccessor(writerKeys, writerExpr);

    var acc = function(){
      if(Snix.accessedGuids)
        throw "nested accessor";

      Snix.accessedGuids = acc.accessedGuids;

      try{
        if(arguments.length == 0) return reader.apply(context, _.values(vars));
        else                      return writer.apply(context, _.values(vars).concat([arguments[0]]));
      }catch(e){
        if(window.console)
          window.console.error(e, expr, context, vars);
        throw "expr: " + expr + ", err: " + e;
      }finally{
        acc.accessedGuids = _.uniq(acc.accessedGuids);
        Snix.accessedGuids = null;
      }
    };
    acc.accessedGuids = [];

    return acc;
  };

  // use only Snix.refresh(context) in application code.
  // you should only pass a DOM element as second argument if you know what you are doing.
  Snix.refresh = function(context, el){
    el = arguments.length > 1 ? el : $("body")[0];
    Snix.bind(el, context);
  };

  Snix.BindingContext = function(el, context, vars){
    this.el = el;
    this.context = context;
    this.vars = vars;
  };
  Snix.BindingContext.prototype.bindChildren = function(){
    bindChildren(this.el, this.context, this.vars);
  };

  var bindChildren = function(el, context, vars){
    $("> [data-bind],> :has([data-bind])", el).each(function(idx, child){
      Snix.bind(child, context, vars);
    });
  };

  Snix.bind = function(el, context, vars){
    vars = _.extend({}, _.pick(window, _.keys(window)), arguments.length > 2 ? vars : {});

    var bindingAttr = $(el).attr("data-bind");
    if(bindingAttr != null){
      var bindingsArr = Snix.parse(bindingAttr),
          initialized = $(el).attr("data-bind-init") != null;

      _.each(bindingsArr, function(arr){
        var bindingName     = arr[0], 
            bindingExpr     = arr[1],
            acc             = Snix.accessor(bindingExpr, context, vars),
            binding         = Snix.Bindings[bindingName],
            bindingContext  = new Snix.BindingContext(el, context, vars),
            refresh         = function(){
              console.info("guids: ", acc.accessedGuids.join(","));
              Snix.refresh(context);
            };

        if(!binding)
          throw "unknown binding: "+bindingName + ", " + bindingExpr;

        if(!initialized && binding.init)
          binding.init.apply(bindingContext, [el, acc, refresh]);

        if(binding.update)
          binding.update.apply(bindingContext, [el, acc]);
      });

      $(el).attr("data-bind-init", "true");
    }else{
      bindChildren(el, context, vars);
    }
  };  
})();