// --------------------------------
// Snix.Ajax
// --------------------------------

(function(){

  var wrapper = function(ajax){
    return {
      success: function(fun, context){
        ajax.success(_.bind(fun, context||this));
        return this;
      },
      error: function(fun, context){
        ajax.error(_.bind(fun, context||this));
        return this;
      }
    };
  };

  Snix.get = function(url){
    var ajax = $.ajax({
      type: "GET", 
      url: url
    });

    return wrapper(ajax);
  };

  Snix.post = function(url, data, wrapData){
    var data = JSON.stringify(data ? data : {});
    var ajax = $.ajax({
      type: "POST", 
      url: url, 
      data: (wrapData ? {data: data} : data), 
      dataType: "json"
    });
    return wrapper(ajax);
  };  

  Snix.put = function(url, data){
    var data = JSON.stringify(data ? data : {});
    var ajax = $.ajax({
      type: "POST", 
      url: url, 
      data: {data: data, _method: "PUT"},
      dataType: "json"
    });
    return wrapper(ajax);
  };  

  Snix.patch = function(url, data){
    var data = JSON.stringify(data ? data : {});
    var ajax = $.ajax({
      type: "POST", 
      url: url, 
      data: {data: data, _method: "PATCH"},
      dataType: "json"
    });
    return wrapper(ajax);
  };  

  Snix.delete = function(url, data){
    var ajax = $.ajax({
      type: "POST", 
      url: url,
      data: {_method: "DELETE"}
    });
    return wrapper(ajax);
  };  

})();

