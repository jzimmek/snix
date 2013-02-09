(function(){

  var Enu = function(id, name){
    this.id = id;
    this.name = name.toString();
  };
  Enu.prototype.toJSON = function(){
    return this.name;
  };
  Enu.prototype.toString = function(){
    return this.name;
  };

  Snix.enu = function(){
    var entries = [];

    for(var i=0; i < arguments.length; i++){
      entries.push(new Enu(i, arguments[i]));
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