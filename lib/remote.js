(function(){
  Snix.remote = function(urlFun, valueFun, context){
    valueFun = arguments.length > 1 ? valueFun : (function(data){ return data; });

    var arr = Snix.compute(function(set){
      var url = (typeof(urlFun) == "function" ? urlFun() : urlFun);

      if(url != null){
        $.getJSON(url).success(function(data){
          Snix.refreshFun(function(){
            set(valueFun(data));
          }, this, context);
        });
      }
    });

    return arr;
  };

  Snix.remoteArray = function(urlFun, valueFun, context){
    valueFun = arguments.length > 1 ? valueFun : (function(data){ return data; });

    var arr = Snix.computeArray(function(set){
      var url = (typeof(urlFun) == "function" ? urlFun() : urlFun);

      if(url != null){
        $.getJSON(url).success(function(data){
          Snix.refreshFun(function(){
            set(_.map(data, valueFun));
          }, this, context);
        });      
      }
    });

    return arr;
  };
})();