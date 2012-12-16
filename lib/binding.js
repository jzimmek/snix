Snix.bindings = {};

Snix.parse = function(str){
  return _.map(str.split(";"), function(s){
    var idx = s.indexOf(":");

    var key = s.substring(0, idx).replace(/\s/g, "");
    var val = s.substring(idx+1,s.length).replace(/^(\s)*/g, "");

    return [key, val];
  });
};

Snix.accessor = function(expr, context, vars){
  expr = expr.replace(/@/g, "this.");
  return function(){
    var code = null;
    try{
      if(arguments.length == 0)   return new Function(_.keys(vars), "return " + expr).apply(context, _.values(vars));
      else                        return new Function(_.keys(vars).concat(["value"]), expr + "(value);").apply(context, _.values(vars).concat([arguments[0]]));
    }catch(e){
      throw "expr: " + expr + ", err: " + e;
    }
  };
};

Snix.binden = function(context, el, vars){
  vars = arguments.length > 2 ? vars : {};

  _.each($(el).toArray(), function(el){
    var bindingAttr = $(el).attr("data-bind");

    if(bindingAttr){
      var bindingsArr = Snix.parse(bindingAttr);
      _.each(bindingsArr, function(arr){
        var bindingName = arr[0], bindingExpr = arr[1];

        var acc = Snix.accessor(bindingExpr, context, vars);
        var binding = Snix.bindings[bindingName];

        if(!binding)
          throw "unknown binding: " + bindingName;

        var bindingContext = {context: context, vars: vars};

        if(binding.init)
          binding.init.apply(bindingContext, [el, acc]);

        if(binding.update){
          var compute = Snix.compute(function(){
            // console.info("updating: ", bindingName, bindingExpr);
            binding.update.apply(bindingContext, [el, acc]);
          });

          $(el).on("destroyed", function(){
            compute.dispose(true);
          });

          compute();
        }
      });
    }else{
      $(el).children().each(function(){
        Snix.binden(context, this, vars);
      });
    }
  });
};
