Snix.enu = function(){
  var entries = [];
  for(var i=0; i < arguments.length; i++){
    var e = {id: i, name: arguments[i]};
    e.toString = function(){
      return this.name;
    };

    entries.push(e);
  }

  var f = function(){
    if(arguments.length == 0){
      return entries;
    }else{
      var entry = _.where(entries, {name: arguments[0]})[0];
      if(!entry)
        throw "unknown in enumeration: " + arguments[0];

      return entry;
    }
  };

  return f;
};
