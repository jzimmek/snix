(function(){

  var method = function(method, url, data, context){
    return $.ajax({
      type: "POST", 
      url: url,
      data: (method == "POST") ? data : {data: data, _method: method},
      dataType: "json",
      context: context
    });
  };

  Snix.Rest = {};
  
  Snix.Rest.errorHandler = function(err){
    alert("rest error");
    if(window.console && window.console.error)
      window.console.error(err);
  };

  Snix.Rest.list = function(url){
    return $.getJSON(url).error(Snix.Rest.errorHandler);
  };

  Snix.Rest.create = function(url, data, context){
    return method("POST", url, data, context).error(Snix.Rest.errorHandler);
  };

  Snix.Rest.save = function(url, data, context){
    return method("PUT", url, data, context).error(Snix.Rest.errorHandler);
  };

  Snix.Rest.destroy = function(url, data, context){
    return method("DELETE", url, data, context).error(Snix.Rest.errorHandler);
  };
  
})();