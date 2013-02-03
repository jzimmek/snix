Snix.array = function(value){
  value = arguments.length > 0 ? value : [];

  if(!_.isArray(value))
    throw "not an array";

  var v = Snix.val(value, {convert: Snix.array.convert});

  v.add = function(entry){
    this().push(entry);
  };

  v.remove = function(entry){
    this(_.without(this(), entry));
  };

  v.size = function(){
    return this().length;
  };

  v.clear = function(){
    this([]);
  };

  var asc = false;
  v.sort = function(attributeName){
    if(!attributeName)
      throw "missing sort attribute";

    asc = !asc;

    this().sort(function(a,b){
      var v1 = Snix.unwrap((asc ? a : b)[attributeName]);
      var v2 = Snix.unwrap((asc ? b : a)[attributeName]);
      return ((v1 == v2) ? 0 : ((v1 < v2) ? -1 : 1));
    });

    Snix.Event.trigger(this, "change", [this(), this()]);
  };

  v.isEmpty = function(){
    return this.size() == 0;
  };

  return v;
};

Snix.array.convert = function(val){
  if(!_.isArray(val))
    throw "not an array";

  return val;
};