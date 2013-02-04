(function(){
  Snix.enu = function(){
    var entries = [];

    for(var i=0; i < arguments.length; i++){
      var e = {id: i, name: arguments[i].toString()};
      e.toJSON = function(){
        return this.name;
      };
      e.toString = function(){
        return this.name;
      };

      entries.push(e);
    }

    var f = function(){
      if(arguments.length == 0){
        return entries;
      }else{
        if(arguments[0] === null)
          return null;

        var entry = _.where(entries, {name: arguments[0].toString()})[0];

        if(!entry)
          throw "unknown in enumeration: " + arguments[0].toString();

        return entry;
      }
    };
    f.__snix__ = true;

    return f;
  };  
})();