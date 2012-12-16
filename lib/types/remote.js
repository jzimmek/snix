Snix.remote = function(urlFun, valueFun){
  var v = Snix.val(null);

  valueFun = arguments.length > 1 ? valueFun : (function(data){ return data; });

  var c = Snix.compute(function(){
    var url = (typeof(urlFun) == "function" ? urlFun() : urlFun);

    if(url)
      $.getJSON(url.toString()).success(function(data){
        v(valueFun(data));
      });

    return null;
  });

  c();

  // force a reload
  v.reload = function(){
    c.forceEvalValue();
  };

  return v;
};

Snix.remoteArray = function(urlFun, valueFun){
  var v = Snix.array([]);

  valueFun = arguments.length > 1 ? valueFun : (function(data){ return data; });

  var c = Snix.compute(function(){
    var url = (typeof(urlFun) == "function" ? urlFun() : urlFun);

    if(url)
      $.getJSON(url.toString()).success(function(data){
        v(_.map(data, valueFun));
      });

    return null;
  });

  c();

  // force a reload
  v.reload = function(){
    c.forceEvalValue();
  };

  return v;
};