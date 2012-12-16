Snix.array = function(initial){
  var v = new Snix.Value(arguments.length > 0 ? initial : []);

  return v.boundFun().tap(function(){
    this.add = function(entry){
      v.fun(_.union(v.fun(), [entry]));
      return this;
    };

    this.remove = function(entry){
      v.fun(_.without(v.fun(), entry));
      return this;
    };

    this.clear = function(){
      v.fun([]);
      return this;
    };

    this.size = function(){
      return v.fun().length;
    };

    this.isEmpty = function(){
      return v.fun().length == 0;
    };
  });
};