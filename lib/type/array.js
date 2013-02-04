(function(){

  function add(entry){
    this().push(entry);
  };

  function remove(entry){
    this(_.without(this(), entry));
  };

  function size(){
    return this().length;
  };

  function clear(){
    this([]);
  };

  function isEmpty(){
    return this.size() == 0;
  };

  function sort(attributeName){
    if(!attributeName)
      throw "missing sort attribute";

    this.sortAsc = !this.sortAsc;

    var self = this;
    this().sort(function(a,b){
      var v1 = Snix.unwrap((self.sortAsc ? a : b)[attributeName]);
      var v2 = Snix.unwrap((self.sortAsc ? b : a)[attributeName]);
      return ((v1 == v2) ? 0 : ((v1 < v2) ? -1 : 1));
    });

    Snix.Event.trigger(this, "change", [this(), this()]);
  };

  function convert(val){
    if(!_.isArray(val))
      throw "not an array";

    return val;
  };

  var proto = {
    add: add,
    remove: remove,
    size: size,
    clear: clear,
    isEmpty: isEmpty,
    sort: sort,
    convert: convert
  };

  Snix.array = function(value){
    value = arguments.length > 0 ? value : [];

    if(!_.isArray(value))
      throw "not an array";

    var v = Snix.val(value);
    v.sortAsc = false;

    return _.extend(v, proto);
  };


})();