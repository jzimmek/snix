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


    return function(){
      try{
        if(arguments.length == 0) return reader.apply(context, _.values(vars));
        else                      return writer.apply(context, _.values(vars).concat([arguments[0]]));
      }catch(e){
        if(window.console)
          window.console.error(e, expr, context, vars);
        throw "expr: " + expr + ", err: " + e;
      }
    };
  };

  // Snix.bench = function(msg, fun, bind, enable){
  //   var start = new Date().getTime();
  //   Snix.bench.enable += (enable ? 1 : 0);
  //   try{
  //     return fun.apply(bind||this);
  //   }finally{
  //     if(enable && Snix.bench.enable > 0){
  //       Snix.bench.enable--;

  //       var end = new Date().getTime();
  //       console.info("bench: "+msg+" took "+(end - start)+" ms");        
  //     }
  //   }
  // };
  // Snix.bench.enable = 0;

  Snix.ensureDOMGuidFor = function(el){
    var start = new Date().getTime();
    $("[data-bind]:not([data-guid])", el).each(function(idx, child){
      var guid = _.uniqueId().toString();
      $(child).attr("data-guid", guid);
    });
    $("[data-guid]:not(data-parent-guid)", el).each(function(idx, child){
      var parentGuid = $($(child).parents("[data-guid]")[0]).attr("data-guid");
      $(child).attr("data-parent-guid", parentGuid);
    });
    var end = new Date().getTime();
    // console.info("--ensureDOMGuidFor--- " + (end - start));
  };


  Snix.ensureDOMGuid = function(){
    var start = new Date().getTime();

    var body = $("body")[0];
    if($(body).attr("data-guid") == null)
      $(body).attr("data-guid", _.uniqueId());

    this.ensureDOMGuidFor(body);

    var end = new Date().getTime();
    // console.info("--ensureDOMGuid--- " + (end - start));
  };

  // use only Snix.refresh(context) in application code.
  // you should only pass a DOM element as second argument if you what you are doing.
  Snix.refresh = function(context, el){
    var start = new Date().getTime();
    el = arguments.length > 1 ? el : $("body")[0];
    
    this.ensureDOMGuid();

    var bindingAttr = $(el).attr("data-bind");

    if(bindingAttr == null){
      var parentGuid = $(el).attr("data-guid");

      if(!parentGuid)
        parentGuid = $($(el).parents("[data-guid]")[0]).attr("data-guid");

      _.each($("[data-bind][data-parent-guid='"+parentGuid+"']", el).toArray(), function(e){
        Snix.bind(e, context);
      });
    }else{
      Snix.bind(el, context);
    }

    var end = new Date().getTime();
    // console.info("--refresh--- " + (end - start));

    // Snix.bind(el, context);
  };

  Snix.BindingContext = function(el, context, vars){
    this.el = el;
    this.context = context;
    this.vars = vars;
  };
  Snix.BindingContext.prototype.bindChildren = function(){
    var guid = $(this.el).attr("data-guid");
    _.each($("[data-parent-guid='"+guid+"']", this.el).toArray(), function(e){
      Snix.bind(e, this.context, this.vars);
    }, this);
  };


  Snix.bind = function(el, context, vars){
    vars = _.extend({}, _.pick(window, _.keys(window)), arguments.length > 2 ? vars : {});

    var bindingAttr = $(el).attr("data-bind");
    if(bindingAttr != null){

        var bindingsArr = Snix.parse(bindingAttr),
            initialized = $(el).attr("data-bind-init") != null,
            refresh     = function(){
              Snix.refresh(context);
            };

        _.each(bindingsArr, function(arr){
          var bindingName     = arr[0], 
              bindingExpr     = arr[1],
              acc             = Snix.accessor(bindingExpr, context, vars),
              binding         = Snix.Bindings[bindingName],
              bindingContext  = new Snix.BindingContext(el, context, vars);

          if(!binding)
            throw "unknown binding: "+bindingName + ", " + bindingExpr;

          if(!initialized && binding.init)
            binding.init.apply(bindingContext, [el, acc, refresh]);

          if(binding.update)
            binding.update.apply(bindingContext, [el, acc]);
        });

        $(el).attr("data-bind-init", "true");
    }else{
      var parentGuid = $($(el).parents("[data-guid]")[0]).attr("data-guid");

      _.each($("[data-parent-guid='"+parentGuid+"']", el).toArray(), function(e){
        Snix.bind(e, context, vars);
      });
    }
  };  
})();