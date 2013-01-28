(function(){
  Snix.remote = function(urlFun, valueFun, context){
    valueFun = arguments.length > 1 ? valueFun : (function(data){ return data; });

    var arr = Snix.compute(function(set){
      var url = (typeof(urlFun) == "function" ? urlFun() : urlFun);

      if(url != null){
        $.getJSON(url).success(function(data){
          set(valueFun(data));
          Snix.refresh(context);
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
          set(_.map(data, valueFun));
          Snix.refresh(context);
        });      
      }
    });

    return arr;
  };
})();